import { useEffect } from 'react';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { isInsideBlockSelectionZone } from '@/features/editor/domain/services/block-selection';

/** Portaled UI (Radix Dialog/Select/Popover) mounts under body, outside the selection zone. */
function isInsidePortaledUi(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        '[role="dialog"]',
        '[data-radix-dialog-content]',
        '[data-radix-dialog-overlay]',
        '[data-radix-popper-content-wrapper]',
        '[data-radix-select-content]',
        '[data-radix-select-viewport]',
        '.dialog-overlay',
        '.dialog-content',
      ].join(', '),
    ),
  );
}

export const useClearBlockSelectionOnOutsideClick = () => {
  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const clearSelection = useEditorStore(state => state.clearSelection);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (selectedRectangleIds.length === 0) return;
      if (isInsideBlockSelectionZone(event.target)) return;
      if (isInsidePortaledUi(event.target)) return;
      clearSelection();
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [selectedRectangleIds, clearSelection]);
};
