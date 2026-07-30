import { useEffect } from 'react';
import { useTemplateStore } from '@/stores/template-store';

export const useClearBlockSelectionOnOutsideClick = () => {
  const selectedRectangleIds = useTemplateStore(state => state.selectedRectangleIds);
  const clearSelection = useTemplateStore(state => state.clearSelection);

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
