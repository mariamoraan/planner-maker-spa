import { create } from 'zustand';
import type { FieldType } from '@/features/template';

export type CanvasTool = 'select' | 'pan';

export type GridEditFocus = 'grid' | 'block';

export interface PreviewPlannerRange {
  start: Date;
  end: Date;
}

interface EditorState {
  currentImageId: string | null;
  selectedRectangleIds: string[];
  selectedFieldType?: FieldType;
  showRectangleGuides: boolean;
  canvasTool: CanvasTool;
  gridEditFocus: GridEditFocus;
  /** Optional date used to drive editor field preview (session-only). */
  previewAnchorDate: Date | null;
  /** Optional planner range override for cover/extra preview (session-only). */
  previewPlannerRange: PreviewPlannerRange | null;

  setCurrentImageId: (id: string | null) => void;
  setSelectedFieldType: (selectedFieldType?: FieldType) => void;
  setSelectedRectangleIds: (selectedRectangleIds: string[]) => void;
  toggleRectangleInSelection: (id: string) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  setShowRectangleGuides: (showRectangleGuides: boolean) => void;
  setCanvasTool: (canvasTool: CanvasTool) => void;
  setGridEditFocus: (gridEditFocus: GridEditFocus) => void;
  setPreviewAnchorDate: (previewAnchorDate: Date | null) => void;
  setPreviewPlannerRange: (previewPlannerRange: PreviewPlannerRange | null) => void;
  resetEditorSession: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentImageId: null,
  selectedRectangleIds: [],
  selectedFieldType: undefined,
  showRectangleGuides: false,
  canvasTool: 'select',
  gridEditFocus: 'grid',
  previewAnchorDate: null,
  previewPlannerRange: null,

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
  setGridEditFocus: (gridEditFocus) => set({ gridEditFocus }),
  setPreviewAnchorDate: (previewAnchorDate) => set({ previewAnchorDate }),
  setPreviewPlannerRange: (previewPlannerRange) => set({ previewPlannerRange }),

  resetEditorSession: () =>
    set({
      currentImageId: null,
      selectedRectangleIds: [],
      selectedFieldType: undefined,
      showRectangleGuides: false,
      canvasTool: 'select',
      gridEditFocus: 'grid',
      previewAnchorDate: null,
      previewPlannerRange: null,
    }),
}));
