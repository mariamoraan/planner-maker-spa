import { create } from 'zustand';
import type { FieldType } from '@/features/template';

export type CanvasTool = 'select' | 'pan';

interface EditorState {
  currentImageId: string | null;
  selectedRectangleIds: string[];
  selectedFieldType?: FieldType;
  showRectangleGuides: boolean;
  canvasTool: CanvasTool;

  setCurrentImageId: (id: string | null) => void;
  setSelectedFieldType: (selectedFieldType?: FieldType) => void;
  setSelectedRectangleIds: (selectedRectangleIds: string[]) => void;
  toggleRectangleInSelection: (id: string) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  setShowRectangleGuides: (showRectangleGuides: boolean) => void;
  setCanvasTool: (canvasTool: CanvasTool) => void;
  resetEditorSession: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentImageId: null,
  selectedRectangleIds: [],
  selectedFieldType: undefined,
  showRectangleGuides: true,
  canvasTool: 'select',

  setCurrentImageId: (currentImageId) => set({ currentImageId }),
  setSelectedFieldType: (selectedFieldType) => set({ selectedFieldType }),
  setSelectedRectangleIds: (selectedRectangleIds) => set({ selectedRectangleIds }),

  toggleRectangleInSelection: (id) =>
    set((state) => ({
      selectedRectangleIds: state.selectedRectangleIds.includes(id)
        ? state.selectedRectangleIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedRectangleIds, id],
    })),

  addToSelection: (id) =>
    set((state) => ({
      selectedRectangleIds: state.selectedRectangleIds.includes(id)
        ? state.selectedRectangleIds
        : [...state.selectedRectangleIds, id],
    })),

  clearSelection: () => set({ selectedRectangleIds: [] }),
  setShowRectangleGuides: (showRectangleGuides) => set({ showRectangleGuides }),
  setCanvasTool: (canvasTool) => set({ canvasTool }),

  resetEditorSession: () =>
    set({
      currentImageId: null,
      selectedRectangleIds: [],
      selectedFieldType: undefined,
      showRectangleGuides: true,
      canvasTool: 'select',
    }),
}));
