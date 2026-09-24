import { create } from 'zustand';
import type { Template, TemplateImage, Rectangle, TemplateType } from '@/features/template';
import { DEFAULT_PLANNER_FONT_ID } from '@/features/template';
import { generateId } from '@/features/template/domain/services/id-generator';
import { detectPlannerLocale, DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import {
  inferTemplatePaperSize,
  paperSizeToPixels,
  type PaperSize,
} from '@/features/template/domain/services/paper-size';
import { trackEvent } from '@/features/template/use-case/commands/analytics.commands';
import {
  getInsertIndexForType,
  imagesOrderChanged,
  normalizeImageOrder,
  reorderUnitsWithinType,
} from '@/features/template/domain/services/template-image-order';
import {
  getSpreadMate,
  isSpreadEligibleType,
  withSpreadFields,
} from '@/features/template/domain/services/template-spread';
import { getInfra, buildLocalImageRef, buildLegacyImageKey, buildUploadthingImageRef, isCloudImageStorageEnabled } from '@/core/bootstrap/infra';
import { isDataUrl } from '@/core/functions/image-data-url';
import {
  PlanLimitError,
  formatBytesLimit,
  resolvePlanLimits,
  resolveUserPlan,
} from '@/core/plans';
import type { ImageRef } from '@/features/template/domain/ports/image-asset.port';
import { getCloudSrcAlt } from '@/features/template/infrastructure/uploadthing/image.adapter';
import { isDisplaySrcFresh } from '@/features/template/infrastructure/uploadthing/content-ticket';
import type { TemplatePageRecord } from '@/features/template/domain/ports/template.port';
import { sanitizeRectangleGeometry } from '@/features/editor/domain/services/canvas-snap';
import { repairGridMetadata, repairGridGroupSettings } from '@/features/editor/domain/services/grid-group';
import { withRepairedBindingMetadata } from '@/features/editor/domain/services/binding-group';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

function currentPlanLimits() {
  return resolvePlanLimits(resolveUserPlan());
}

/** Approximate decoded size of a data URL (base64 → bytes). */
function approximateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl.startsWith('data:')) return dataUrl.length;
  const comma = dataUrl.indexOf(',');
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

const RECTANGLE_SYNC_DELAY_MS = 500;
const IMAGE_LOAD_CONCURRENCY = 3;
const rectangleSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: 'fulfilled', value: await mapper(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

function resolveImageRef(uid: string | null, pageId: string, existing?: ImageRef): ImageRef {
  if (existing) return existing;
  if (uid && isCloudImageStorageEnabled()) return buildUploadthingImageRef(uid, pageId);
  if (uid) return buildLocalImageRef(uid, pageId);
  return { provider: 'local', key: buildLegacyImageKey(pageId) };
}

function buildImageRefCandidates(
  uid: string | null,
  pageId: string,
  existing?: ImageRef
): ImageRef[] {
  const candidates: ImageRef[] = [];
  const seen = new Set<string>();

  const add = (ref: ImageRef) => {
    const identity = `${ref.provider}:${ref.key}`;
    if (!ref.key || seen.has(identity)) return;
    seen.add(identity);
    candidates.push(ref);
  };

  if (existing?.key) add(existing);
  if (uid && isCloudImageStorageEnabled()) {
    add(buildUploadthingImageRef(uid, pageId, existing?.url, existing?.fileKey));
  }
  if (uid) add(buildLocalImageRef(uid, pageId));
  add({ provider: 'local', key: buildLegacyImageKey(pageId) });

  return candidates;
}

async function persistCloudImageRef(
  uid: string,
  templateId: string,
  pageId: string,
  imageRef: ImageRef
): Promise<void> {
  // fileKey is what makes the image recoverable later; url is only a convenience.
  if (!isCloudImageStorageEnabled() || (!imageRef.fileKey && !imageRef.url)) return;
  await getInfra().templates.updatePage(uid, templateId, pageId, { imageRef });
}

async function loadImageFromCandidates(
  candidates: ImageRef[]
): Promise<{ src: string; ref: ImageRef } | null> {
  const { images } = getInfra();
  for (const ref of candidates) {
    const src = await images.load(ref);
    if (src) return { src, ref };
  }
  return null;
}

async function loadPageSrc(uid: string | null, image: TemplateImage): Promise<TemplateImage> {
  const candidates = buildImageRefCandidates(uid, image.id, image.imageRef);
  const loaded = await loadImageFromCandidates(candidates);
  const ref = loaded?.ref ?? resolveImageRef(uid, image.id, image.imageRef);
  const srcAlt = getCloudSrcAlt(ref);

  return {
    ...image,
    imageRef: ref,
    src: loaded?.src ?? '',
    srcAlt: srcAlt && srcAlt !== loaded?.src ? srcAlt : undefined,
    missingLocalAsset: !loaded,
  };
}

export function pageNeedsImageLoad(image: TemplateImage): boolean {
  return needsImageLoad(image);
}

function needsImageLoad(image: TemplateImage): boolean {
  // Need a src. Same-origin content proxy URLs and data URLs are valid for <img>,
  // but a proxy ticket or signed CDN URL that has lapsed must be resolved again.
  return !image.src || !isDisplaySrcFresh(image.src);
}

const inFlightPageLoads = new Map<string, Promise<TemplateImage>>();

/** Collapses overlapping loads of the same page into one request. */
function loadPageSrcOnce(uid: string | null, image: TemplateImage): Promise<TemplateImage> {
  const existing = inFlightPageLoads.get(image.id);
  if (existing) return existing;

  const pending = loadPageSrc(uid, image).finally(() => {
    inFlightPageLoads.delete(image.id);
  });
  inFlightPageLoads.set(image.id, pending);
  return pending;
}

function withRepairedGridMetadata(image: TemplateImage): TemplateImage {
  const gridGroups = repairGridGroupSettings(image.gridGroups);
  const rectangles = repairGridMetadata(image.rectangles, gridGroups);
  const withGrid =
    rectangles === image.rectangles && gridGroups === image.gridGroups
      ? image
      : { ...image, rectangles, gridGroups };
  return withRepairedBindingMetadata(withGrid);
}

function toPageRecord(uid: string, image: TemplateImage): TemplatePageRecord {
  const imageRef = resolveImageRef(uid, image.id, image.imageRef);
  return {
    id: image.id,
    name: image.name,
    type: image.type,
    width: image.width,
    height: image.height,
    rectangles: image.rectangles,
    gridGroups: image.gridGroups,
    bindingGroups: image.bindingGroups,
    imageRef,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
    ...(image.spreadId ? { spreadId: image.spreadId } : {}),
    ...(image.spreadFace ? { spreadFace: image.spreadFace } : {}),
  };
}

export type { CanvasTool } from '@/features/editor/ui/stores/editor-store';

interface TemplateState {
  templates: Template[];
  syncUid: string | null;
  isSyncReady: boolean;
  isMigrating: boolean;

  setSyncUser: (uid: string | null) => void;
  setMigrating: (isMigrating: boolean) => void;
  hydrateFromRemote: (templates: Template[]) => void;
  resetSync: () => void;

  createTemplate: (name: string, paperSize: PaperSize, description?: string) => string;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => Promise<void>;
  loadTemplateImages: (id: string) => Promise<void>;
  loadAllTemplateImages: () => Promise<void>;
  getTemplate: (id: string) => Template | null;

  addImage: (data: {
    templateId: string;
    imageData: string;
    type: TemplateType;
    width?: number;
    height?: number;
    name?: string;
  }) => Promise<string>;
  getImageData: (imageId: string) => Promise<string | undefined>;
  updateImage: (templateId: string, imageId: string, updates: Partial<TemplateImage> & {
    gridGroups?: TemplateImage['gridGroups'] | null;
    bindingGroups?: TemplateImage['bindingGroups'] | null;
    spreadId?: TemplateImage['spreadId'] | null;
    spreadFace?: TemplateImage['spreadFace'] | null;
  }) => void;
  deleteImage: (templateId: string, imageId: string) => Promise<void>;
  enableSpread: (
    templateId: string,
    pageId: string,
    options: { rightImageData: string }
  ) => Promise<string>;
  disableSpread: (templateId: string, pageId: string) => Promise<void>;
  setCurrentImage: (id: string | null) => Promise<void>;
  getCurrentImage: (templateId: string) => TemplateImage | null;

  addRectangle: (templateId: string, imageId: string, rectangle: Omit<Rectangle, 'id'>) => string;
  insertRectangle: (templateId: string, imageId: string, rectangle: Rectangle, index: number) => void;
  updateRectangle: (
    templateId: string,
    imageId: string,
    rectangleId: string,
    updates: Partial<Rectangle>
  ) => void;
  updateRectangles: (
    templateId: string,
    imageId: string,
    updates: { rectangleId: string; changes: Partial<Rectangle> }[]
  ) => void;
  deleteRectangle: (templateId: string, imageId: string, rectangleId: string) => void;
  reorderRectangles: (templateId: string, imageId: string, orderedIds: string[]) => void;

  insertImage: (templateId: string, image: TemplateImage, imageData: string, index: number) => Promise<void>;
  normalizeImageOrder: (templateId: string) => void;
  /** Reorder by page unit id (spreadId or single page id). */
  reorderImages: (templateId: string, activeUnitId: string, overUnitId: string) => boolean;
}

export const useTemplateStore = create<TemplateState>()((set, get) => {
  const syncRectanglesWithGridMetadata = (
    templateId: string,
    imageId: string,
    rectangles: Rectangle[],
  ): Rectangle[] => {
    const image = get().templates
      .find(t => t.id === templateId)
      ?.images.find(img => img.id === imageId);
    return repairGridMetadata(rectangles, image?.gridGroups);
  };

  const rectangleSyncKey = (templateId: string, imageId: string) => `${templateId}-${imageId}`;

  const cancelRectangleSync = (templateId: string, imageId: string) => {
    const key = rectangleSyncKey(templateId, imageId);
    const existing = rectangleSyncTimers.get(key);
    if (!existing) return;
    clearTimeout(existing);
    rectangleSyncTimers.delete(key);
  };

  const flushRectangleSync = (templateId: string, imageId: string) => {
    const uid = get().syncUid;
    if (!uid) return;
    const image = get().templates
      .find(t => t.id === templateId)
      ?.images.find(img => img.id === imageId);
    if (!image) return;
    void getInfra().templates.updatePageRectangles(
      uid,
      templateId,
      imageId,
      syncRectanglesWithGridMetadata(templateId, imageId, image.rectangles),
    );
  };

  const scheduleRectangleSync = (templateId: string, imageId: string) => {
    if (!get().syncUid) return;
    cancelRectangleSync(templateId, imageId);
    const key = rectangleSyncKey(templateId, imageId);
    rectangleSyncTimers.set(
      key,
      setTimeout(() => {
        rectangleSyncTimers.delete(key);
        flushRectangleSync(templateId, imageId);
      }, RECTANGLE_SYNC_DELAY_MS),
    );
  };

  const syncRectanglesNow = (
    templateId: string,
    imageId: string,
    rectangles: Rectangle[],
  ) => {
    cancelRectangleSync(templateId, imageId);
    const uid = get().syncUid;
    if (!uid) return;
    void getInfra().templates.updatePageRectangles(
      uid,
      templateId,
      imageId,
      syncRectanglesWithGridMetadata(templateId, imageId, rectangles),
    );
  };

  return {
  templates: [],
  syncUid: null,
  isSyncReady: false,
  isMigrating: false,

  setSyncUser: uid => set({ syncUid: uid }),
  setMigrating: isMigrating => set({ isMigrating }),
  resetSync: () => {
    useEditorStore.getState().resetEditorSession();
    set({
      templates: [],
      syncUid: null,
      isSyncReady: false,
      isMigrating: false,
    });
  },

  hydrateFromRemote: remoteTemplates => {
    set(state => {
      const srcByPageId = new Map<string, string>();
      state.templates.forEach(t =>
        t.images.forEach(img => {
          // Carrying a lapsed src across a resync would render a broken image
          // and mask the fact that it needs resolving again.
          if (img.src && isDisplaySrcFresh(img.src)) srcByPageId.set(img.id, img.src);
        })
      );

      const remoteTemplateIds = new Set(remoteTemplates.map(t => t.id));
      const localOnlyTemplates = state.templates.filter(t => !remoteTemplateIds.has(t.id));

      const mergeImages = (localTemplate: Template | undefined, remoteTemplate: Template): TemplateImage[] => {
        const localById = new Map(localTemplate?.images.map(img => [img.id, img]) ?? []);
        const remoteImageIds = new Set(remoteTemplate.images.map(img => img.id));

        const merged = remoteTemplate.images.map(remoteImg => {
          const localImg = localById.get(remoteImg.id);
          const src = srcByPageId.get(remoteImg.id) ?? remoteImg.src ?? '';

          if (localImg && localImg.updatedAt.getTime() > remoteImg.updatedAt.getTime()) {
            return withRepairedGridMetadata({ ...localImg, src, missingLocalAsset: false });
          }

          return withRepairedGridMetadata({ ...remoteImg, src, missingLocalAsset: false });
        });

        localTemplate?.images.forEach(localImg => {
          if (!remoteImageIds.has(localImg.id)) {
            merged.push({
              ...localImg,
              src: srcByPageId.get(localImg.id) ?? localImg.src ?? '',
              missingLocalAsset: false,
            });
          }
        });

        return merged;
      };

      const templates = [
        ...remoteTemplates.map(remoteTemplate => {
          const localTemplate = state.templates.find(t => t.id === remoteTemplate.id);
          return {
            ...remoteTemplate,
            images: mergeImages(localTemplate, remoteTemplate),
          };
        }),
        ...localOnlyTemplates,
      ];

      return { templates, isSyncReady: true };
    });

    for (const template of get().templates) {
      if (template.paperSize) continue;
      const paperSize = inferTemplatePaperSize(template);
      get().updateTemplate(template.id, { paperSize });
    }
  },

  createTemplate: (name, paperSize, description) => {
    const limits = currentPlanLimits();
    if (get().templates.length >= limits.maxPlanners) {
      throw new PlanLimitError(
        'planners',
        `Free plan allows up to ${limits.maxPlanners} planners. Delete one to create another.`,
      );
    }

    const id = generateId();
    const now = new Date();
    const template: Template = {
      id,
      name,
      description,
      images: [],
      paperSize,
      createdAt: now,
      updatedAt: now,
      locale: detectPlannerLocale(),
      weekStartsOn: DEFAULT_WEEK_STARTS_ON,
      defaultFontId: DEFAULT_PLANNER_FONT_ID,
    };
    set(state => ({ templates: [...state.templates, template] }));
    trackEvent('planner_created');

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.createTemplate(uid, template);
    }

    return id;
  },

  updateTemplate: (id, updates) => {
    set(state => ({
      templates: state.templates.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
      ),
    }));

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.updateTemplate(uid, id, {
        name: updates.name,
        description: updates.description,
        startDate: updates.startDate,
        endDate: updates.endDate,
        locale: updates.locale,
        weekStartsOn: updates.weekStartsOn,
        defaultFontId: updates.defaultFontId,
        paperSize: updates.paperSize,
        customColors: updates.customColors,
      });
    }
  },

  deleteTemplate: async id => {
    const state = get();
    const index = state.templates.findIndex(t => t.id === id);
    const template = index >= 0 ? state.templates[index] : undefined;
    const uid = state.syncUid;
    if (!template || index < 0) return;

    const editor = useEditorStore.getState();
    const clearedCurrentImage = template.images.some(img => img.id === editor.currentImageId);

    set(current => ({
      templates: current.templates.filter(t => t.id !== id),
    }));

    if (clearedCurrentImage) {
      editor.setCurrentImageId(null);
    }

    try {
      const { images } = getInfra();
      await Promise.all(
        template.images.map(img => {
          const ref = resolveImageRef(uid, img.id, img.imageRef);
          return images.delete(ref);
        })
      );

      if (uid) {
        await getInfra().templates.deleteTemplate(uid, id);
      }
    } catch (error) {
      console.error('[template-store] deleteTemplate failed, rolling back:', error);

      set(current => {
        if (current.templates.some(t => t.id === id)) return current;
        const templates = [...current.templates];
        templates.splice(Math.min(index, templates.length), 0, template);
        return { templates };
      });

      throw error;
    }
  },

  loadTemplateImages: async id => {
    const uid = get().syncUid;
    const template = get().templates.find(t => t.id === id);
    if (!template) return;

    const toLoad = template.images.filter(needsImageLoad);
    if (toLoad.length === 0) return;

    const results = await mapWithConcurrency(toLoad, IMAGE_LOAD_CONCURRENCY, img =>
      loadPageSrcOnce(uid, img)
    );
    const loadedById = new Map(
      results
        .filter((r): r is PromiseFulfilledResult<TemplateImage> => r.status === 'fulfilled')
        .map(r => [r.value.id, r.value])
    );

    set(state => ({
      templates: state.templates.map(t =>
        t.id !== id
          ? t
          : {
              ...t,
              images: t.images.map(img => loadedById.get(img.id) ?? img),
            }
      ),
    }));
  },

  loadAllTemplateImages: async () => {
    const uid = get().syncUid;
    const templates = get().templates;
    if (templates.length === 0) return;

    const toLoad = templates.flatMap(t =>
      t.images.filter(needsImageLoad).map(img => img)
    );
    if (toLoad.length === 0) return;

    const results = await mapWithConcurrency(toLoad, IMAGE_LOAD_CONCURRENCY, img =>
      loadPageSrcOnce(uid, img)
    );
    const loadedById = new Map(
      results
        .filter((r): r is PromiseFulfilledResult<TemplateImage> => r.status === 'fulfilled')
        .map(r => [r.value.id, r.value])
    );

    set(state => ({
      templates: state.templates.map(t => ({
        ...t,
        images: t.images.map(img => loadedById.get(img.id) ?? img),
      })),
    }));
  },

  getTemplate: id => get().templates.find(t => t.id === id) ?? null,

  addImage: async ({ templateId, imageData, name, type }) => {
    const uid = get().syncUid;
    const template = get().templates.find(t => t.id === templateId);
    const limits = currentPlanLimits();
    if ((template?.images.length ?? 0) >= limits.maxImagesPerPlanner) {
      throw new PlanLimitError(
        'images',
        `Free plan allows up to ${limits.maxImagesPerPlanner} pages per planner. Delete one to add another.`,
      );
    }

    const approxBytes = approximateDataUrlBytes(imageData);
    if (approxBytes > limits.maxImageBytes) {
      throw new PlanLimitError(
        'imageSize',
        `Images must be ${formatBytesLimit(limits.maxImageBytes)} or smaller on the free plan.`,
      );
    }

    const paperSize = template?.paperSize ?? inferTemplatePaperSize(template ?? {
      id: templateId,
      name: '',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { width: pageWidth, height: pageHeight } = paperSizeToPixels(paperSize);
    const id = generateId();
    const now = new Date();
    const imageRef = resolveImageRef(uid, id);
    const image: TemplateImage = {
      id,
      name: name ?? 'Untitled',
      type,
      width: pageWidth,
      height: pageHeight,
      rectangles: [],
      createdAt: now,
      updatedAt: now,
      src: imageData,
      imageRef,
      missingLocalAsset: false,
    };

    let insertIndex = 0;
    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        const images = [...t.images];
        insertIndex = getInsertIndexForType(images, type);
        images.splice(insertIndex, 0, image);
        return { ...t, images, updatedAt: new Date() };
      }),
    }));
    useEditorStore.getState().setCurrentImageId(id);

    await getInfra().images.save(imageRef, imageData, { templateId });
    // Keep the original data URL for display — never swap it for a CDN/proxy HTTPS
    // that may fail on networks that cannot reach UploadThing.
    const resolvedSrc = isDataUrl(imageData)
      ? imageData
      : ((await getInfra().images.load(imageRef)) ?? imageData);

    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          images: t.images.map(img =>
            img.id === id ? { ...img, src: resolvedSrc, imageRef, missingLocalAsset: false } : img
          ),
          updatedAt: new Date(),
        };
      }),
    }));

    if (uid) {
      const liveImage =
        get().templates.find(t => t.id === templateId)?.images.find(img => img.id === id) ?? image;
      const page = toPageRecord(uid, { ...liveImage, src: resolvedSrc, imageRef });
      await getInfra().templates.createPage(uid, templateId, page, insertIndex);
      await persistCloudImageRef(uid, templateId, id, imageRef);
      // Rectangle writes during upload can miss the doc; flush live rects after create.
      const afterCreate = get().templates
        .find(t => t.id === templateId)
        ?.images.find(img => img.id === id);
      if (afterCreate && afterCreate.rectangles.length > 0) {
        syncRectanglesNow(templateId, id, afterCreate.rectangles);
      }
    }

    return id;
  },

  getImageData: async imageId => {
    const uid = get().syncUid;
    for (const template of get().templates) {
      const image = template.images.find(img => img.id === imageId);
      if (image) {
        const ref = resolveImageRef(uid, imageId, image.imageRef);
        return (await getInfra().images.load(ref)) ?? undefined;
      }
    }
    return undefined;
  },

  updateImage: (templateId, imageId, updates) => {
    const localUpdates: Partial<TemplateImage> = {
      ...updates,
      gridGroups: updates.gridGroups === null ? undefined : updates.gridGroups,
      bindingGroups: updates.bindingGroups === null ? undefined : updates.bindingGroups,
    };
    if (updates.spreadId === null) {
      delete localUpdates.spreadId;
    }
    if (updates.spreadFace === null) {
      delete localUpdates.spreadFace;
    }

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                const next = { ...img, ...localUpdates, updatedAt: new Date() };
                if (updates.spreadId === null) delete next.spreadId;
                if (updates.spreadFace === null) delete next.spreadFace;
                return next;
              }),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    const uid = get().syncUid;
    if (uid) {
      const pageUpdates: Partial<TemplatePageRecord> & {
        gridGroups?: TemplatePageRecord['gridGroups'] | null;
        bindingGroups?: TemplatePageRecord['bindingGroups'] | null;
        spreadId?: TemplatePageRecord['spreadId'] | null;
        spreadFace?: TemplatePageRecord['spreadFace'] | null;
      } = {};
      if (updates.name !== undefined) pageUpdates.name = updates.name;
      if (updates.type !== undefined) pageUpdates.type = updates.type;
      if (updates.width !== undefined) pageUpdates.width = updates.width;
      if (updates.height !== undefined) pageUpdates.height = updates.height;
      if (updates.rectangles !== undefined) pageUpdates.rectangles = updates.rectangles;
      if (updates.gridGroups !== undefined) {
        pageUpdates.gridGroups = updates.gridGroups;
      }
      if (updates.bindingGroups !== undefined) {
        pageUpdates.bindingGroups = updates.bindingGroups;
      }
      if (updates.imageRef !== undefined) pageUpdates.imageRef = updates.imageRef;
      if (updates.spreadId !== undefined) pageUpdates.spreadId = updates.spreadId;
      if (updates.spreadFace !== undefined) pageUpdates.spreadFace = updates.spreadFace;

      void getInfra().templates.updatePage(uid, templateId, imageId, pageUpdates);
    }
  },

  deleteImage: async (templateId, imageId) => {
    const uid = get().syncUid;
    const template = get().templates.find(t => t.id === templateId);
    const index = template?.images.findIndex(img => img.id === imageId) ?? -1;
    const image = index >= 0 ? template?.images[index] : undefined;
    if (!image || index < 0) return;

    const editor = useEditorStore.getState();
    const wasCurrent = editor.currentImageId === imageId;

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? { ...t, images: t.images.filter(img => img.id !== imageId), updatedAt: new Date() }
          : t
      ),
    }));

    if (wasCurrent) {
      editor.setCurrentImageId(null);
    }

    try {
      const ref = resolveImageRef(uid, imageId, image.imageRef);
      await getInfra().images.delete(ref);

      if (uid) {
        await getInfra().templates.deletePage(uid, templateId, imageId);
      }
    } catch (error) {
      console.error('[template-store] deleteImage failed, rolling back:', error);

      set(state => ({
        templates: state.templates.map(t => {
          if (t.id !== templateId) return t;
          if (t.images.some(img => img.id === imageId)) return t;
          const images = [...t.images];
          images.splice(Math.min(index, images.length), 0, image);
          return { ...t, images, updatedAt: new Date() };
        }),
      }));

      if (wasCurrent) {
        useEditorStore.getState().setCurrentImageId(imageId);
      }

      throw error;
    }
  },

  insertImage: async (templateId, image, imageData, index) => {
    const uid = get().syncUid;
    const template = get().templates.find(t => t.id === templateId);
    const limits = currentPlanLimits();
    if ((template?.images.length ?? 0) >= limits.maxImagesPerPlanner) {
      throw new PlanLimitError(
        'images',
        `Free plan allows up to ${limits.maxImagesPerPlanner} pages per planner. Delete one to add another.`,
      );
    }

    const imageRef = resolveImageRef(uid, image.id, image.imageRef);
    const imageWithSrc: TemplateImage = {
      ...image,
      src: imageData,
      imageRef,
      missingLocalAsset: false,
    };

    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        const images = [...t.images];
        images.splice(index, 0, imageWithSrc);
        return { ...t, images, updatedAt: new Date() };
      }),
    }));
    useEditorStore.getState().setCurrentImageId(image.id);

    await getInfra().images.save(imageRef, imageData, { templateId });
    // Keep the original data URL for display — never swap it for a CDN/proxy HTTPS
    // that may fail on networks that cannot reach UploadThing.
    const resolvedSrc = isDataUrl(imageData)
      ? imageData
      : ((await getInfra().images.load(imageRef)) ?? imageData);
    const savedImage: TemplateImage = { ...imageWithSrc, src: resolvedSrc, imageRef };

    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          images: t.images.map(img =>
            img.id === image.id
              ? { ...img, src: resolvedSrc, imageRef, missingLocalAsset: false }
              : img
          ),
          updatedAt: new Date(),
        };
      }),
    }));

    if (uid) {
      const liveImage =
        get().templates.find(t => t.id === templateId)?.images.find(img => img.id === image.id) ??
        savedImage;
      const page = toPageRecord(uid, { ...liveImage, src: resolvedSrc, imageRef });
      await getInfra().templates.createPage(uid, templateId, page, index);
      await persistCloudImageRef(uid, templateId, image.id, imageRef);
      const afterCreate = get().templates
        .find(t => t.id === templateId)
        ?.images.find(img => img.id === image.id);
      if (afterCreate && afterCreate.rectangles.length > 0) {
        syncRectanglesNow(templateId, image.id, afterCreate.rectangles);
      }
    }
  },

  normalizeImageOrder: templateId => {
    let normalizedIds: string[] | null = null;
    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        const normalized = normalizeImageOrder(t.images);
        if (!imagesOrderChanged(t.images, normalized)) return t;
        normalizedIds = normalized.map(img => img.id);
        return { ...t, images: normalized, updatedAt: new Date() };
      }),
    }));

    const uid = get().syncUid;
    if (uid && normalizedIds) {
      void getInfra().templates.setPageOrder(uid, templateId, normalizedIds);
    }
  },

  reorderImages: (templateId, activeUnitId, overUnitId) => {
    const template = get().templates.find(t => t.id === templateId);
    if (!template) return false;

    const reordered = reorderUnitsWithinType(template.images, activeUnitId, overUnitId);
    if (!reordered) return false;

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId ? { ...t, images: reordered, updatedAt: new Date() } : t
      ),
    }));

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.setPageOrder(
        uid,
        templateId,
        reordered.map(img => img.id)
      );
    }

    return true;
  },

  enableSpread: async (templateId, pageId, options) => {
    const uid = get().syncUid;
    const template = get().templates.find(t => t.id === templateId);
    const page = template?.images.find(img => img.id === pageId);
    if (!template || !page) {
      throw new Error('Page not found');
    }
    if (!isSpreadEligibleType(page.type)) {
      throw new Error('This page type cannot use contiguous pages');
    }
    if (page.spreadId) {
      return getSpreadMate(page, template.images)?.id ?? pageId;
    }

    const rightImageData = options.rightImageData;
    if (!rightImageData) {
      throw new Error('Right page image is required');
    }

    const limits = currentPlanLimits();
    if (template.images.length >= limits.maxImagesPerPlanner) {
      throw new PlanLimitError(
        'images',
        `Free plan allows up to ${limits.maxImagesPerPlanner} pages per planner. Delete one to add another.`,
      );
    }

    const approxBytes = approximateDataUrlBytes(rightImageData);
    if (approxBytes > limits.maxImageBytes) {
      throw new PlanLimitError(
        'imageSize',
        `Images must be ${formatBytesLimit(limits.maxImageBytes)} or smaller on the free plan.`,
      );
    }

    const spreadId = generateId();
    const rightId = generateId();
    const now = new Date();
    const imageRef = resolveImageRef(uid, rightId);
    const leftIndex = template.images.findIndex(img => img.id === pageId);

    const rightPage: TemplateImage = {
      id: rightId,
      name: `${page.name} (R)`,
      type: page.type,
      width: page.width,
      height: page.height,
      rectangles: [],
      createdAt: now,
      updatedAt: now,
      src: rightImageData,
      imageRef,
      missingLocalAsset: false,
      spreadId,
      spreadFace: 'right',
    };

    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        const images = t.images.map(img =>
          img.id === pageId ? withSpreadFields(img, spreadId, 'left') : img
        );
        const insertAt = leftIndex >= 0 ? leftIndex + 1 : images.length;
        images.splice(insertAt, 0, rightPage);
        return { ...t, images, updatedAt: new Date() };
      }),
    }));

    get().updateImage(templateId, pageId, { spreadId, spreadFace: 'left' });

    await getInfra().images.save(imageRef, rightImageData, { templateId });
    const resolvedSrc = isDataUrl(rightImageData)
      ? rightImageData
      : ((await getInfra().images.load(imageRef)) ?? rightImageData);

    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          images: t.images.map(img =>
            img.id === rightId
              ? { ...img, src: resolvedSrc, imageRef, missingLocalAsset: false }
              : img
          ),
          updatedAt: new Date(),
        };
      }),
    }));

    if (uid) {
      await getInfra().templates.updatePage(uid, templateId, pageId, {
        spreadId,
        spreadFace: 'left',
      });
      const liveRight =
        get().templates.find(t => t.id === templateId)?.images.find(img => img.id === rightId) ??
        rightPage;
      const insertIndex =
        get().templates.find(t => t.id === templateId)?.images.findIndex(img => img.id === rightId) ??
        leftIndex + 1;
      await getInfra().templates.createPage(
        uid,
        templateId,
        toPageRecord(uid, { ...liveRight, src: resolvedSrc, imageRef }),
        insertIndex
      );
      await persistCloudImageRef(uid, templateId, rightId, imageRef);
    }

    return rightId;
  },

  disableSpread: async (templateId, pageId) => {
    const template = get().templates.find(t => t.id === templateId);
    const page = template?.images.find(img => img.id === pageId);
    if (!template || !page?.spreadId) return;

    const mate = getSpreadMate(page, template.images);
    const left = page.spreadFace === 'left' ? page : mate;
    const right = page.spreadFace === 'right' ? page : mate;

    if (left?.spreadId) {
      get().updateImage(templateId, left.id, { spreadId: null, spreadFace: null });
    }
    if (right?.spreadId) {
      get().updateImage(templateId, right.id, { spreadId: null, spreadFace: null });
    }

    useEditorStore.getState().setCurrentImageId(page.id);
  },

  setCurrentImage: async id => {
    useEditorStore.getState().setCurrentImageId(id);
    if (!id) return;

    const uid = get().syncUid;
    const state = get();
    const template = state.templates.find(t => t.images.some(img => img.id === id));
    const image = template?.images.find(img => img.id === id);
    if (!template || !image || image.src) return;

    const loaded = await loadPageSrc(uid, image);
    set(state => ({
      templates: state.templates.map(t =>
        t.id === template.id
          ? {
              ...t,
              images: t.images.map(img => (img.id === id ? loaded : img)),
            }
          : t
      ),
    }));
  },

  getCurrentImage: templateId => {
    const template = get().getTemplate(templateId);
    const currentImageId = useEditorStore.getState().currentImageId;
    return template?.images.find(img => img.id === currentImageId) ?? null;
  },

  addRectangle: (templateId, imageId, rectangleData) => {
    const id = generateId();
    const sanitized = sanitizeRectangleGeometry(rectangleData);
    const rectangle: Rectangle = { ...rectangleData, ...sanitized, id };
    let rectangles: Rectangle[] = [];

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                rectangles = [...img.rectangles, rectangle];
                return { ...img, rectangles, updatedAt: new Date() };
              }),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    trackEvent('block_added', { fieldType: rectangleData.fieldType });

    syncRectanglesNow(templateId, imageId, rectangles);

    return id;
  },

  insertRectangle: (templateId, imageId, rectangle, index) => {
    let rectangles: Rectangle[] = [];
    const sanitizedRectangle = { ...rectangle, ...sanitizeRectangleGeometry(rectangle) };

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                rectangles = [...img.rectangles];
                rectangles.splice(index, 0, sanitizedRectangle);
                return { ...img, rectangles, updatedAt: new Date() };
              }),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    syncRectanglesNow(templateId, imageId, rectangles);
  },

  updateRectangle: (templateId, imageId, rectangleId, updates) => {
    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                const rectangles = img.rectangles.map(r =>
                  r.id === rectangleId
                    ? { ...r, ...sanitizeRectangleGeometry(updates) }
                    : r
                );
                return { ...img, rectangles, updatedAt: new Date() };
              }),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    scheduleRectangleSync(templateId, imageId);
  },

  updateRectangles: (templateId, imageId, updates) => {
    if (updates.length === 0) return;

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                const changesById = new Map(
                  updates.map(update => [update.rectangleId, update.changes]),
                );
                const rectangles = img.rectangles.map(rect => {
                  const changes = changesById.get(rect.id);
                  return changes ? { ...rect, ...sanitizeRectangleGeometry(changes) } : rect;
                });
                return { ...img, rectangles, updatedAt: new Date() };
              }),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    scheduleRectangleSync(templateId, imageId);
  },

  deleteRectangle: (templateId, imageId, rectangleId) => {
    let rectangles: Rectangle[] = [];

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                rectangles = img.rectangles.filter(r => r.id !== rectangleId);
                return { ...img, rectangles, updatedAt: new Date() };
              }),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    syncRectanglesNow(templateId, imageId, rectangles);
  },

  reorderRectangles: (templateId, imageId, orderedIds) => {
    let rectangles: Rectangle[] = [];

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                const byId = new Map(img.rectangles.map(rect => [rect.id, rect]));
                rectangles = orderedIds
                  .map(id => byId.get(id))
                  .filter((rect): rect is Rectangle => rect !== undefined);
                return { ...img, rectangles, updatedAt: new Date() };
              }),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    syncRectanglesNow(templateId, imageId, rectangles);
  },
};
});
