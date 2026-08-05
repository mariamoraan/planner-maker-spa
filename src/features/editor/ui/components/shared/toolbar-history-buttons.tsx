import { LargeArrowLeftIcon, LargeArrowRightIcon } from '@/core/icons';
import { useHistoryStore } from '@/features/editor/ui/stores/history-store';
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id';

export const ToolbarHistoryButtons = () => {
  const templateId = useTemplateId();
  const canUndo = useHistoryStore(state =>
    templateId ? (state.histories[templateId]?.past.length ?? 0) > 0 : false,
  );
  const canRedo = useHistoryStore(state =>
    templateId ? (state.histories[templateId]?.future.length ?? 0) > 0 : false,
  );
  const undo = useHistoryStore(state => state.undo);
  const redo = useHistoryStore(state => state.redo);

  return (
    <>
      <button
        className="base-toolbar__undo"
        type="button"
        disabled={!canUndo}
        onClick={() => templateId && undo(templateId)}
        aria-label="Undo"
      >
        <LargeArrowLeftIcon />
      </button>
      <button
        className="base-toolbar__redo"
        type="button"
        disabled={!canRedo}
        onClick={() => templateId && redo(templateId)}
        aria-label="Redo"
      >
        <LargeArrowRightIcon />
      </button>
    </>
  );
};
