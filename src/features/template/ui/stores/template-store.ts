import { create } from 'zustand';
import type { Template, TemplateImage, Rectangle, TemplateType } from '@/features/template';
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
  reorderWithinType,
} from '@/features/template/domain/services/template-image-order';
import { getInfra, buildLocalImageRef, buildLegacyImageKey, buildUploadthingImageRef, isCloudImageStorageEnabled } from '@/core/bootstrap/infra';
import type { ImageRef } from '@/features/template/domain/ports/image-asset.port';
import type { TemplatePageRecord } from '@/features/template/domain/ports/template.port';
import { sanitizeRectangleGeometry } from '@/features/editor/domain/services/canvas-snap';
import { repairGridMetadata } from '@/features/editor/domain/services/grid-group';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

const RECTANGLE_SYNC_DELAY_MS = 500;
const rectangleSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
  if (!isCloudImageStorageEnabled() || !imageRef.url) return;
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

  return {
    ...image,
    imageRef: ref,
    src: loaded?.src ?? '',
    missingLocalAsset: !loaded,
  };
}

function needsImageLoad(image: TemplateImage): boolean {
  return !image.src;
}

function withRepairedGridMetadata(image: TemplateImage): TemplateImage {
  const rectangles = repairGridMetadata(image.rectangles, image.gridGroups);
  if (rectangles === image.rectangles) return image;
  return { ...image, rectangles };
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
    imageRef,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
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
  updateImage: (templateId: string, imageId: string, updates: Partial<TemplateImage> & { gridGroups?: TemplateImage['gridGroups'] | null }) => void;
  deleteImage: (templateId: string, imageId: string) => Promise<void>;
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
  reorderImages: (templateId: string, activeId: string, overId: string) => boolean;
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
          if (img.src) srcByPageId.set(img.id, img.src);
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
        paperSize: updates.paperSize,
      });
    }
  },

  deleteTemplate: async id => {
    const state = get();
    const template = state.templates.find(t => t.id === id);
    const uid = state.syncUid;

    if (template) {
      const { images } = getInfra();
      await Promise.all(
        template.images.map(img => {
          const ref = resolveImageRef(uid, img.id, img.imageRef);
          return images.delete(ref);
        })
      );
    }

    if (uid) {
      await getInfra().templates.deleteTemplate(uid, id);
    }

    set(state => ({
      templates: state.templates.filter(t => t.id !== id),
    }));

    const editor = useEditorStore.getState();
    if (template?.images.some(img => img.id === editor.currentImageId)) {
      editor.setCurrentImageId(null);
    }
  },

  loadTemplateImages: async id => {
    const uid = get().syncUid;
    const template = get().templates.find(t => t.id === id);
    if (!template) return;

    const toLoad = template.images.filter(needsImageLoad);
    if (toLoad.length === 0) return;

    const loaded = await Promise.all(toLoad.map(img => loadPageSrc(uid, img)));
    const loadedById = new Map(loaded.map(img => [img.id, img]));

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

    const loaded = await Promise.all(toLoad.map(img => loadPageSrc(uid, img)));
    const loadedById = new Map(loaded.map(img => [img.id, img]));

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

    await getInfra().images.save(imageRef, imageData);
    const resolvedSrc = (await getInfra().images.load(imageRef)) ?? imageData;

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
      const page = toPageRecord(uid, { ...image, src: resolvedSrc, imageRef });
      await getInfra().templates.createPage(uid, templateId, page, insertIndex);
      await persistCloudImageRef(uid, templateId, id, imageRef);
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
    };

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img =>
                img.id === imageId ? { ...img, ...localUpdates, updatedAt: new Date() } : img
              ),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    const uid = get().syncUid;
    if (uid) {
      const pageUpdates: Partial<TemplatePageRecord> & {
        gridGroups?: TemplatePageRecord['gridGroups'] | null;
      } = {};
      if (updates.name !== undefined) pageUpdates.name = updates.name;
      if (updates.type !== undefined) pageUpdates.type = updates.type;
      if (updates.width !== undefined) pageUpdates.width = updates.width;
      if (updates.height !== undefined) pageUpdates.height = updates.height;
      if (updates.rectangles !== undefined) pageUpdates.rectangles = updates.rectangles;
      if (updates.gridGroups !== undefined) {
        pageUpdates.gridGroups = updates.gridGroups;
      }
      if (updates.imageRef !== undefined) pageUpdates.imageRef = updates.imageRef;

      void getInfra().templates.updatePage(uid, templateId, imageId, pageUpdates);
    }
  },

  deleteImage: async (templateId, imageId) => {
    const uid = get().syncUid;
    const template = get().templates.find(t => t.id === templateId);
    const image = template?.images.find(img => img.id === imageId);
    if (image) {
      const ref = resolveImageRef(uid, imageId, image.imageRef);
      await getInfra().images.delete(ref);
    }

    if (uid) {
      await getInfra().templates.deletePage(uid, templateId, imageId);
    }

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? { ...t, images: t.images.filter(img => img.id !== imageId), updatedAt: new Date() }
          : t
      ),
    }));

    const editor = useEditorStore.getState();
    if (editor.currentImageId === imageId) {
      editor.setCurrentImageId(null);
    }
  },

  insertImage: async (templateId, image, imageData, index) => {
    const uid = get().syncUid;
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

    await getInfra().images.save(imageRef, imageData);
    const resolvedSrc = (await getInfra().images.load(imageRef)) ?? imageData;
    const savedImage: TemplateImage = { ...imageWithSrc, src: resolvedSrc, imageRef };

    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          images: t.images.map(img => (img.id === image.id ? savedImage : img)),
          updatedAt: new Date(),
        };
      }),
    }));

    if (uid) {
      await getInfra().templates.createPage(uid, templateId, toPageRecord(uid, savedImage), index);
      await persistCloudImageRef(uid, templateId, image.id, imageRef);
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

  reorderImages: (templateId, activeId, overId) => {
    const template = get().templates.find(t => t.id === templateId);
    if (!template) return false;

    const reordered = reorderWithinType(template.images, activeId, overId);
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

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.updatePageRectangles(
        uid,
        templateId,
        imageId,
        syncRectanglesWithGridMetadata(templateId, imageId, rectangles),
      );
    }

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

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.updatePageRectangles(
        uid,
        templateId,
        imageId,
        syncRectanglesWithGridMetadata(templateId, imageId, rectangles),
      );
    }
  },

  updateRectangle: (templateId, imageId, rectangleId, updates) => {
    let rectangles: Rectangle[] = [];

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img => {
                if (img.id !== imageId) return img;
                rectangles = img.rectangles.map(r =>
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

    const uid = get().syncUid;
    if (!uid) return;

    const key = `${templateId}-${imageId}`;
    const existing = rectangleSyncTimers.get(key);
    if (existing) clearTimeout(existing);

    rectangleSyncTimers.set(
      key,
      setTimeout(() => {
        rectangleSyncTimers.delete(key);
        void getInfra().templates.updatePageRectangles(
          uid,
          templateId,
          imageId,
          syncRectanglesWithGridMetadata(templateId, imageId, rectangles),
        );
      }, RECTANGLE_SYNC_DELAY_MS)
    );
  },

  updateRectangles: (templateId, imageId, updates) => {
    if (updates.length === 0) return;

    let rectangles: Rectangle[] = [];

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
                rectangles = img.rectangles.map(rect => {
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

    const uid = get().syncUid;
    if (!uid) return;

    const key = `${templateId}-${imageId}`;
    const existing = rectangleSyncTimers.get(key);
    if (existing) clearTimeout(existing);

    rectangleSyncTimers.set(
      key,
      setTimeout(() => {
        rectangleSyncTimers.delete(key);
        void getInfra().templates.updatePageRectangles(
          uid,
          templateId,
          imageId,
          syncRectanglesWithGridMetadata(templateId, imageId, rectangles),
        );
      }, RECTANGLE_SYNC_DELAY_MS)
    );
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

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.updatePageRectangles(
        uid,
        templateId,
        imageId,
        syncRectanglesWithGridMetadata(templateId, imageId, rectangles),
      );
    }
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

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.updatePageRectangles(
        uid,
        templateId,
        imageId,
        syncRectanglesWithGridMetadata(templateId, imageId, rectangles),
      );
    }
  },
};
});
