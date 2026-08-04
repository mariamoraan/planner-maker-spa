import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import type { FieldType } from '@/features/template';
import type { CanvasTool } from '@/features/editor/ui/stores/editor-store';

export const setSelectedRectangleIds = (ids: string[]) =>
  useEditorStore.getState().setSelectedRectangleIds(ids);

export const setSelectedFieldType = (fieldType?: FieldType) =>
  useEditorStore.getState().setSelectedFieldType(fieldType);

export const clearSelection = () => useEditorStore.getState().clearSelection();

export const toggleRectangleInSelection = (id: string) =>
  useEditorStore.getState().toggleRectangleInSelection(id);

export const addToSelection = (id: string) =>
  useEditorStore.getState().addToSelection(id);

export const setCanvasTool = (tool: CanvasTool) =>
  useEditorStore.getState().setCanvasTool(tool);

export const setShowRectangleGuides = (show: boolean) =>
  useEditorStore.getState().setShowRectangleGuides(show);

export const setCurrentImageId = (id: string | null) =>
  useEditorStore.getState().setCurrentImageId(id);
