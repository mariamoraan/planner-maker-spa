import { useEffect } from 'react';
import { isInsideBlockSelectionZone } from '@/lib/block-selection';
import { useTemplateStore } from '@/stores/template-store';

export function useClearBlockSelectionOnOutsideClick() {
  const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId);
  const setSelectedRectangleId = useTemplateStore(state => state.setSelectedRectangleId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!selectedRectangleId) return;
      if (isInsideBlockSelectionZone(e.target)) return;
      setSelectedRectangleId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedRectangleId, setSelectedRectangleId]);
}
