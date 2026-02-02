import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Template, TemplateImage, Rectangle } from '@/types/planner';
import { generateId } from '@/lib/planner-utils';

const reviveDates = (templates: Template[]): Template[] => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setMonth(today.getMonth() + 1)
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
    })),
  }));
}
  


interface TemplateState {
  templates: Template[];
  currentTemplateId: string | null;
  currentImageId: string | null;
  
  // Template actions
  createTemplate: (name: string, description?: string) => string;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  setCurrentTemplate: (id: string | null) => void;
  
  // Image actions
  addImage: (templateId: string, image: Omit<TemplateImage, 'id' | 'createdAt' | 'updatedAt' | 'rectangles'>) => string;
  updateImage: (templateId: string, imageId: string, updates: Partial<TemplateImage>) => void;
  deleteImage: (templateId: string, imageId: string) => void;
  setCurrentImage: (id: string | null) => void;
  
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
      
      deleteTemplate: (id) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== id),
          currentTemplateId: state.currentTemplateId === id ? null : state.currentTemplateId,
        }));
      },
      
      setCurrentTemplate: (id) => {
        set({ currentTemplateId: id, currentImageId: null });
      },
      
      addImage: (templateId, imageData) => {
        const id = generateId();
        const now = new Date();
        const image: TemplateImage = {
          ...imageData,
          id,
          rectangles: [],
          createdAt: now,
          updatedAt: now,
        };
        
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, images: [...t.images, image], updatedAt: new Date() }
              : t
          ),
          currentImageId: id,
        }));
        
        return id;
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
      
      deleteImage: (templateId, imageId) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, images: t.images.filter(img => img.id !== imageId), updatedAt: new Date() }
              : t
          ),
          currentImageId: state.currentImageId === imageId ? null : state.currentImageId,
        }));
      },
      
      setCurrentImage: (id) => {
        set({ currentImageId: id });
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
      partialize: (state) => ({ templates: state.templates }),
      onRehydrateStorage: () => (state) => {
        if(!state) return;
        state.templates = reviveDates(state.templates);
      }
    }
  )
);
