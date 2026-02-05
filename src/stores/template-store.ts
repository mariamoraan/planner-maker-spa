import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Template, TemplateImage, Rectangle, TemplateType } from '@/types/planner';
import { generateId } from '@/lib/planner-utils';
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
  templates: Template[];
  currentTemplateId: string | null;
  currentImageId: string | null;

  // Template actions
  createTemplate: (name: string, description?: string) => string;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => Promise<void>;
  setCurrentTemplate: (id: string | null) => Promise<void>;

  // Image actions
  addImage: (data: {templateId: string, imageData: string, type: TemplateType, width: number, height: number, name?: string}) => Promise<string>;
  getImageData: (imageId: string) => Promise<string | undefined>;
  updateImage: (templateId: string, imageId: string, updates: Partial<TemplateImage>) => void;
  deleteImage: (templateId: string, imageId: string) => Promise<void>;
  setCurrentImage: (id: string | null) => Promise<void>;

  // Rectangle actions
  addRectangle: (templateId: string, imageId: string, rectangle: Omit<Rectangle, 'id'>) => string;
  updateRectangle: (templateId: string, imageId: string, rectangleId: string, updates: Partial<Rectangle>) => void;
  deleteRectangle: (templateId: string, imageId: string, rectangleId: string) => void;

  // Getters
  getCurrentTemplate: () => Template | null;
  getCurrentImage: () => TemplateImage | null;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      currentTemplateId: null,
      currentImageId: null,

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
          currentTemplateId: id,
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
          currentTemplateId: state.currentTemplateId === id ? null : state.currentTemplateId,
          currentImageId: state.currentImageId && template?.images.some(img => img.id === state.currentImageId) ? null : state.currentImageId,
        }));
      },

      setCurrentTemplate: async (id) => {
        set({ currentTemplateId: id, currentImageId: null });
        if (id) {
          const template = get().templates.find(t => t.id === id);
          if (template) {
            // cargar imágenes automáticamente desde IndexedDB
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
        }
      },

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
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, images: [...t.images, image], updatedAt: new Date() }
              : t
          ),
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
          currentImageId: state.currentImageId === imageId ? null : state.currentImageId,
        }));
      },

      setCurrentImage: async (id) => {
        set({ currentImageId: id });
        if (id) {
          // Cargar src desde IndexedDB automáticamente
          const template = get().getCurrentTemplate();
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

      getCurrentTemplate: () => {
        const state = get();
        return state.templates.find(t => t.id === state.currentTemplateId) ?? null;
      },

      getCurrentImage: () => {
        const state = get();
        const template = state.getCurrentTemplate();
        return template?.images.find(img => img.id === state.currentImageId) ?? null;
      },
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
