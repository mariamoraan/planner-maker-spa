import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

export const getCurrentImageId = () => useEditorStore.getState().currentImageId;

export const getSelectedRectangleIds = () => useEditorStore.getState().selectedRectangleIds;

export const getCanvasTool = () => useEditorStore.getState().canvasTool;

export const getShowRectangleGuides = () => useEditorStore.getState().showRectangleGuides;
