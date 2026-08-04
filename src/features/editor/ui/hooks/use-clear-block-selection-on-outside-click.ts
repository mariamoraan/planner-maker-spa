import { useEffect } from 'react';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';

export const useClearBlockSelectionOnOutsideClick = () => {
  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const clearSelection = useEditorStore(state => state.clearSelection);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (selectedRectangleIds.length === 0) return;
      if ((event.target as Element).closest('[data-block-selection-zone]')) return;
      clearSelection();
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [selectedRectangleIds, clearSelection]);
};
