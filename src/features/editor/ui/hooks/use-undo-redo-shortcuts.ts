import { useEffect } from 'react';
import { useHistoryStore } from '@/features/editor/ui/stores/history-store';
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id';

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
};

export const useUndoRedoShortcuts = () => {
  const templateId = useTemplateId();
  const canUndo = useHistoryStore(state =>
    templateId ? state.canUndo(templateId) : false
  );
  const canRedo = useHistoryStore(state =>
    templateId ? state.canRedo(templateId) : false
  );
  const undo = useHistoryStore(state => state.undo);
  const redo = useHistoryStore(state => state.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!templateId) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          if (!canRedo) return;
          e.preventDefault();
          redo(templateId);
        } else {
          if (!canUndo) return;
          e.preventDefault();
          undo(templateId);
        }
        return;
      }

      if (!isMac && e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
        if (!canRedo) return;
        e.preventDefault();
        redo(templateId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [templateId, canUndo, canRedo, undo, redo]);
};
