import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Template, TemplateImage, Rectangle, TemplateType, FieldType } from '@/types/planner';
import { generateId } from '@/lib/planner-utils';
import {
  getInsertIndexForType,
  imagesOrderChanged,
  normalizeImageOrder,
  reorderWithinType,
} from '@/lib/template-image-order';
import { set as idbSet, get as idbGet, del as idbDel } from 'idb-keyval';

const reviveDates = (templates: Template[]): Template[] => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setMonth(today.getMonth() + 1);
  return templates.map(t => ({
    ...t,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
    startDate: t.startDate ? new Date(t.startDate) : today,
    endDate: t.endDate ? new Date(t.endDate) : tomorrow,
    images: t.images.map(img => ({
      ...img,
      createdAt: new Date(img.createdAt),
      updatedAt: new Date(img.updatedAt),
      src: undefined, // no persistimos imagenes grandes
    })),
  }));
};

interface TemplateState {

  // Template actions
  templates: Template[];
  createTemplate: (name: string, description?: string) => string;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => Promise<void>;
  loadTemplateImages: (id: string) => Promise<void>;
  getTemplate: (id: string) => Template | null;


  // Image actions
  currentImageId: string | null;
  addImage: (data: {templateId: string, imageData: string, type: TemplateType, width: number, height: number, name?: string}) => Promise<string>;
  getImageData: (imageId: string) => Promise<string | undefined>;
  updateImage: (templateId: string, imageId: string, updates: Partial<TemplateImage>) => void;
  deleteImage: (templateId: string, imageId: string) => Promise<void>;
  setCurrentImage: (id: string | null) => Promise<void>;
  getCurrentImage: (templateId: string) => TemplateImage | null;


  // Rectangle actions
  selectedRectangleId: string | null;
  selectedFieldType?: FieldType;
  showRectangleGuides: boolean;
  addRectangle: (templateId: string, imageId: string, rectangle: Omit<Rectangle, 'id'>) => string;
  insertRectangle: (templateId: string, imageId: string, rectangle: Rectangle, index: number) => void;
  updateRectangle: (templateId: string, imageId: string, rectangleId: string, updates: Partial<Rectangle>) => void;
  deleteRectangle: (templateId: string, imageId: string, rectangleId: string) => void;
  setSelectedFieldType: (selectedFieldType?: FieldType) => void;
  setSelectedRectangleId: (selectedRectangleId: string | null) => void;
  setShowRectangleGuides: (showRectangleGuides: boolean) => void;

  // Image history helpers
  insertImage: (templateId: string, image: TemplateImage, imageData: string, index: number) => Promise<void>;
  normalizeImageOrder: (templateId: string) => void;
  reorderImages: (templateId: string, activeId: string, overId: string) => boolean;

  // Generator Actions
  isGeneratorOpen: boolean;
  closeGenerator: () => void;
  openGenerator: () => void;
  setIsGeneratorOpen: (isGeneratorOpen: boolean) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],

      // Template actions

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
        };
        set(state => ({
          templates: [...state.templates, template],
        }));
        return id;
      },

      updateTemplate: (id, updates) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        }));
      },

      deleteTemplate: async (id) => {
        const state = get();
        const template = state.templates.find(t => t.id === id);
        if (template) {
          await Promise.all(template.images.map(img => idbDel(`image-${img.id}`)));
        }
        set(state => ({
          templates: state.templates.filter(t => t.id !== id),
          currentImageId: state.currentImageId && template?.images.some(img => img.id === state.currentImageId) ? null : state.currentImageId,
        }));
      },

      loadTemplateImages: async (id) => {
        const template = get().templates.find(t => t.id === id);
        if (template) {
          const imagesWithSrc = await Promise.all(
            template.images.map(async (img) => ({
              ...img,
              src: await idbGet(`image-${img.id}`),
            }))
          );
          set(state => ({
            templates: state.templates.map(t =>
              t.id === id ? { ...t, images: imagesWithSrc } : t
            ),
          }));
        }
      },

      getTemplate: (id) => {
        return get().templates.find(t => t.id === id) ?? null;
      },

      // Image actions
      currentImageId: null,

      addImage: async ({
        templateId, 
        imageData, 
        name, 
        type,
        width,
        height,
      }: {
        templateId: string, 
        imageData: string, 
        name: string, 
        type: TemplateType,
        width: number,
        height: number,
      }) => {
        const id = generateId();
        const now = new Date();
        const image: TemplateImage = {
          id,
          name,
          type,
          width,
          height,
          rectangles: [],
          createdAt: now,
          updatedAt: now,
          src: imageData, // temporal para la UI
        };
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id !== templateId) return t;
            const images = [...t.images];
            const insertIndex = getInsertIndexForType(images, type);
            images.splice(insertIndex, 0, image);
            return { ...t, images, updatedAt: new Date() };
          }),
          currentImageId: id,
        }));
        await idbSet(`image-${id}`, imageData);
        return id;
      },

      getImageData: async (imageId) => {
        return idbGet(`image-${imageId}`);
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
      },

      deleteImage: async (templateId, imageId) => {
        await idbDel(`image-${imageId}`);
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, images: t.images.filter(img => img.id !== imageId), updatedAt: new Date() }
              : t
          ),
          currentImageId: state.currentImageId === imageId 
          ? null 
          : state.currentImageId,
        }));
      },

      insertImage: async (templateId, image, imageData, index) => {
        const imageWithSrc: TemplateImage = { ...image, src: imageData };
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id !== templateId) return t;
            const images = [...t.images];
            images.splice(index, 0, imageWithSrc);
            return { ...t, images, updatedAt: new Date() };
          }),
          currentImageId: image.id,
        }));
        await idbSet(`image-${image.id}`, imageData);
      },

      normalizeImageOrder: (templateId) => {
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id !== templateId) return t;
            const normalized = normalizeImageOrder(t.images);
            if (!imagesOrderChanged(t.images, normalized)) return t;
            return { ...t, images: normalized, updatedAt: new Date() };
          }),
        }));
      },

      reorderImages: (templateId, activeId, overId) => {
        const template = get().templates.find(t => t.id === templateId);
        if (!template) return false;

        const reordered = reorderWithinType(template.images, activeId, overId);
        if (!reordered) return false;

        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, images: reordered, updatedAt: new Date() }
              : t
          ),
        }));

        return true;
      },

      setCurrentImage: async (id) => {
        set({ currentImageId: id });
        if (id) {
          const state = get();
          const template = state.templates.find(t => t.images.some(img => img.id === id));
          if (!template) return;
          const image = template.images.find(img => img.id === id);
          if (image) {
            const src = await idbGet(`image-${id}`);
            set(state => ({
              templates: state.templates.map(t =>
                t.id === template.id
                  ? {
                      ...t,
                      images: t.images.map(img =>
                        img.id === id ? { ...img, src } : img
                      ),
                    }
                  : t
              ),
            }));
          }
        }
      },

       getCurrentImage: (templateId) => {
        const state = get();
        const template = state.getTemplate(templateId);
        return template?.images.find(img => img.id === state.currentImageId) ?? null;
      },

      // Rectangle actions
      selectedRectangleId: null,
      selectedFieldType: undefined,
      showRectangleGuides: true,
      
      addRectangle: (templateId, imageId, rectangleData) => {
        const id = generateId();
        const rectangle: Rectangle = { ...rectangleData, id };
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? {
                  ...t,
                  images: t.images.map(img =>
                    img.id === imageId
                      ? { ...img, rectangles: [...img.rectangles, rectangle], updatedAt: new Date() }
                      : img
                  ),
                  updatedAt: new Date(),
                }
              : t
          ),
        }));
        return id;
      },

      insertRectangle: (templateId, imageId, rectangle, index) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? {
                  ...t,
                  images: t.images.map(img => {
                    if (img.id !== imageId) return img;
                    const rectangles = [...img.rectangles];
                    rectangles.splice(index, 0, rectangle);
                    return { ...img, rectangles, updatedAt: new Date() };
                  }),
                  updatedAt: new Date(),
                }
              : t
          ),
        }));
      },

      updateRectangle: (templateId, imageId, rectangleId, updates) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? {
                  ...t,
                  images: t.images.map(img =>
                    img.id === imageId
                      ? {
                          ...img,
                          rectangles: img.rectangles.map(r =>
                            r.id === rectangleId ? { ...r, ...updates } : r
                          ),
                          updatedAt: new Date(),
                        }
                      : img
                  ),
                  updatedAt: new Date(),
                }
              : t
          ),
        }));
      },

      deleteRectangle: (templateId, imageId, rectangleId) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? {
                  ...t,
                  images: t.images.map(img =>
                    img.id === imageId
                      ? {
                          ...img,
                          rectangles: img.rectangles.filter(r => r.id !== rectangleId),
                          updatedAt: new Date(),
                        }
                      : img
                  ),
                  updatedAt: new Date(),
                }
              : t
          ),
        }));
      },
      
      setSelectedFieldType: (selectedFieldType?: FieldType) => set({selectedFieldType}),
      setSelectedRectangleId: (selectedRectangleId: string | null) =>  set({selectedRectangleId}),
      setShowRectangleGuides: (showRectangleGuides: boolean) => set({showRectangleGuides}),

      // Generator Actions

      isGeneratorOpen: false,
      closeGenerator: () => {
        set(({
          isGeneratorOpen: false,
        }))
      },
      openGenerator: () => {
        set({
          isGeneratorOpen: true
        })
      },
      setIsGeneratorOpen: (isGeneratorOpen: boolean) => {
        set({
          isGeneratorOpen
        })
      }
    }),
    {
      name: 'planner-templates',
      partialize: (state) => ({
        templates: state.templates.map(t => ({
          ...t,
          images: t.images.map(img => ({ ...img, src: undefined })), // no persistimos src
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.templates = reviveDates(state.templates);
      },
    }
  )
);
