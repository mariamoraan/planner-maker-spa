import { create } from 'zustand';
import type { Template, TemplateImage, Rectangle, TemplateType, FieldType } from '@/types/planner';
import { generateId } from '@/lib/planner-utils';
import { detectPlannerLocale, DEFAULT_WEEK_STARTS_ON } from '@/lib/locale-config';
import { trackEvent } from '@/lib/analytics';
import {
  getInsertIndexForType,
  imagesOrderChanged,
  normalizeImageOrder,
  reorderWithinType,
} from '@/lib/template-image-order';
import { getInfra, buildLocalImageRef, buildLegacyImageKey } from '@/infrastructure';
import type { ImageRef } from '@/infrastructure/ports/image-asset.port';
import type { TemplatePageRecord } from '@/infrastructure/ports/template.port';
import { sanitizeRectangleGeometry } from '@/lib/canvas-snap';

const RECTANGLE_SYNC_DELAY_MS = 500;
const rectangleSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function resolveImageRef(uid: string | null, pageId: string, existing?: ImageRef): ImageRef {
  if (existing) return existing;
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
    if (!ref.key || seen.has(ref.key)) return;
    seen.add(ref.key);
    candidates.push(ref);
  };

  if (existing?.key) add(existing);
  if (uid) add(buildLocalImageRef(uid, pageId));
  add({ provider: 'local', key: buildLegacyImageKey(pageId) });

  return candidates;
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

function toPageRecord(uid: string, image: TemplateImage): TemplatePageRecord {
  const imageRef = resolveImageRef(uid, image.id, image.imageRef);
  return {
    id: image.id,
    name: image.name,
    type: image.type,
    width: image.width,
    height: image.height,
    rectangles: image.rectangles,
    imageRef,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };
}

export type CanvasTool = 'select' | 'pan' | 'measure';

interface TemplateState {
  templates: Template[];
  syncUid: string | null;
  isSyncReady: boolean;
  isMigrating: boolean;

  setSyncUser: (uid: string | null) => void;
  setMigrating: (isMigrating: boolean) => void;
  hydrateFromRemote: (templates: Template[]) => void;
  resetSync: () => void;

  createTemplate: (name: string, description?: string) => string;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => Promise<void>;
  loadTemplateImages: (id: string) => Promise<void>;
  loadAllTemplateImages: () => Promise<void>;
  getTemplate: (id: string) => Template | null;

  currentImageId: string | null;
  addImage: (data: {
    templateId: string;
    imageData: string;
    type: TemplateType;
    width: number;
    height: number;
    name?: string;
  }) => Promise<string>;
  getImageData: (imageId: string) => Promise<string | undefined>;
  updateImage: (templateId: string, imageId: string, updates: Partial<TemplateImage>) => void;
  deleteImage: (templateId: string, imageId: string) => Promise<void>;
  setCurrentImage: (id: string | null) => Promise<void>;
  getCurrentImage: (templateId: string) => TemplateImage | null;

  selectedRectangleIds: string[];
  selectedFieldType?: FieldType;
  showRectangleGuides: boolean;
  canvasTool: CanvasTool;
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
  setSelectedFieldType: (selectedFieldType?: FieldType) => void;
  setSelectedRectangleIds: (selectedRectangleIds: string[]) => void;
  toggleRectangleInSelection: (id: string) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  setShowRectangleGuides: (showRectangleGuides: boolean) => void;
  setCanvasTool: (canvasTool: CanvasTool) => void;

  insertImage: (templateId: string, image: TemplateImage, imageData: string, index: number) => Promise<void>;
  normalizeImageOrder: (templateId: string) => void;
  reorderImages: (templateId: string, activeId: string, overId: string) => boolean;

  isGeneratorOpen: boolean;
  closeGenerator: () => void;
  openGenerator: () => void;
  setIsGeneratorOpen: (isGeneratorOpen: boolean) => void;
}

export const useTemplateStore = create<TemplateState>()((set, get) => ({
  templates: [],
  syncUid: null,
  isSyncReady: false,
  isMigrating: false,

  setSyncUser: uid => set({ syncUid: uid }),
  setMigrating: isMigrating => set({ isMigrating }),
  resetSync: () =>
    set({
      templates: [],
      syncUid: null,
      isSyncReady: false,
      isMigrating: false,
      currentImageId: null,
    }),

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
          const src = srcByPageId.get(remoteImg.id) ?? '';

          if (localImg && localImg.updatedAt.getTime() > remoteImg.updatedAt.getTime()) {
            return { ...localImg, src, missingLocalAsset: false };
          }

          return { ...remoteImg, src, missingLocalAsset: false };
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
  },

  createTemplate: (name, description) => {
    const id = generateId();
    const now = new Date();
    const template: Template = {
      id,
      name,
      description,
      images: [],
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
      currentImageId:
        state.currentImageId && template?.images.some(img => img.id === state.currentImageId)
          ? null
          : state.currentImageId,
    }));
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

  currentImageId: null,

  addImage: async ({ templateId, imageData, name, type, width, height }) => {
    const uid = get().syncUid;
    const id = generateId();
    const now = new Date();
    const imageRef = resolveImageRef(uid, id);
    const image: TemplateImage = {
      id,
      name: name ?? 'Untitled',
      type,
      width,
      height,
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
      currentImageId: id,
    }));

    await getInfra().images.save(imageRef, imageData);

    if (uid) {
      await getInfra().templates.createPage(uid, templateId, toPageRecord(uid, image), insertIndex);
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
    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              images: t.images.map(img =>
                img.id === imageId ? { ...img, ...updates, updatedAt: new Date() } : img
              ),
              updatedAt: new Date(),
            }
          : t
      ),
    }));

    const uid = get().syncUid;
    if (uid) {
      void getInfra().templates.updatePage(uid, templateId, imageId, {
        name: updates.name,
        type: updates.type,
        width: updates.width,
        height: updates.height,
        rectangles: updates.rectangles,
      });
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
      currentImageId: state.currentImageId === imageId ? null : state.currentImageId,
    }));
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
      currentImageId: image.id,
    }));

    await getInfra().images.save(imageRef, imageData);

    if (uid) {
      await getInfra().templates.createPage(uid, templateId, toPageRecord(uid, imageWithSrc), index);
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
    set({ currentImageId: id });
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
    const state = get();
    const template = state.getTemplate(templateId);
    return template?.images.find(img => img.id === state.currentImageId) ?? null;
  },

  selectedRectangleIds: [],
  selectedFieldType: undefined,
  showRectangleGuides: true,
  canvasTool: 'select',

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
      void getInfra().templates.updatePageRectangles(uid, templateId, imageId, rectangles);
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
      void getInfra().templates.updatePageRectangles(uid, templateId, imageId, rectangles);
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
        void getInfra().templates.updatePageRectangles(uid, templateId, imageId, rectangles);
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
        void getInfra().templates.updatePageRectangles(uid, templateId, imageId, rectangles);
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
      void getInfra().templates.updatePageRectangles(uid, templateId, imageId, rectangles);
    }
  },

  setSelectedFieldType: selectedFieldType => set({ selectedFieldType }),
  setSelectedRectangleIds: selectedRectangleIds => set({ selectedRectangleIds }),

  toggleRectangleInSelection: id =>
    set(state => ({
      selectedRectangleIds: state.selectedRectangleIds.includes(id)
        ? state.selectedRectangleIds.filter(selectedId => selectedId !== id)
        : [...state.selectedRectangleIds, id],
    })),

  addToSelection: id =>
    set(state => ({
      selectedRectangleIds: state.selectedRectangleIds.includes(id)
        ? state.selectedRectangleIds
        : [...state.selectedRectangleIds, id],
    })),

  clearSelection: () => set({ selectedRectangleIds: [] }),
  setShowRectangleGuides: showRectangleGuides => set({ showRectangleGuides }),
  setCanvasTool: canvasTool => set({ canvasTool }),

  isGeneratorOpen: false,
  closeGenerator: () => set({ isGeneratorOpen: false }),
  openGenerator: () => set({ isGeneratorOpen: true }),
  setIsGeneratorOpen: isGeneratorOpen => set({ isGeneratorOpen }),
}));
