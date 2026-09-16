import './grid-add-dimension-controls.scss';

import { useTranslation } from 'react-i18next';
import { ColumnsIcon, PlusIcon, RowsIcon } from '@/core/icons';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import type { GridBounds } from '@/features/editor/domain/services/grid-layout';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';

const MAX_DIMENSION = 20;
const OUTSET_PX = 6;
const BUTTON_SIZE_PX = 32;
const STACK_GAP_PX = 4;
const EDGE_PAD_PX = 8;
const CONTROL_WIDTH_PX = BUTTON_SIZE_PX;
const CONTROL_HEIGHT_PX = BUTTON_SIZE_PX * 2 + STACK_GAP_PX;

function clampDimension(value: number): number {
  return Math.min(MAX_DIMENSION, Math.max(1, value));
}

/** Keep the control stack visible inside the canvas when the grid hugs an edge. */
function positionWithinViewport(
  preferredLeft: number,
  preferredTop: number,
  cornerX: number,
  cornerY: number,
  stageSize: { width: number; height: number },
): { left: number; top: number } {
  let left = preferredLeft;
  let top = preferredTop;

  if (left + CONTROL_WIDTH_PX + EDGE_PAD_PX > stageSize.width) {
    left = cornerX - CONTROL_WIDTH_PX - OUTSET_PX;
  }
  if (top + CONTROL_HEIGHT_PX + EDGE_PAD_PX > stageSize.height) {
    top = cornerY - CONTROL_HEIGHT_PX - OUTSET_PX;
  }

  const maxLeft = Math.max(EDGE_PAD_PX, stageSize.width - CONTROL_WIDTH_PX - EDGE_PAD_PX);
  const maxTop = Math.max(EDGE_PAD_PX, stageSize.height - CONTROL_HEIGHT_PX - EDGE_PAD_PX);

  return {
    left: Math.min(Math.max(left, EDGE_PAD_PX), maxLeft),
    top: Math.min(Math.max(top, EDGE_PAD_PX), maxTop),
  };
}

interface GridAddDimensionControlsProps {
  groupId: string;
  bounds: GridBounds;
  scale: number;
  offset: { x: number; y: number };
  stageSize: { width: number; height: number };
  cols: number;
  rows: number;
}

export const GridAddDimensionControls = ({
  groupId,
  bounds,
  scale,
  offset,
  stageSize,
  cols,
  rows,
}: GridAddDimensionControlsProps) => {
  const { t } = useTranslation();
  const { updateGroupSettings } = useGridGroupOps();

  const cornerX = offset.x + (bounds.x + bounds.width) * scale;
  const cornerY = offset.y + (bounds.y + bounds.height) * scale;
  const { left, top } = positionWithinViewport(
    cornerX + OUTSET_PX,
    cornerY + OUTSET_PX,
    cornerX,
    cornerY,
    stageSize,
  );

  const canAddCol = cols < MAX_DIMENSION;
  const canAddRow = rows < MAX_DIMENSION;

  return (
    <div
      className="grid-add-dimension-controls"
      style={{ left, top }}
      {...blockSelectionZoneProps}
    >
      <button
        type="button"
        className="grid-add-dimension-controls__btn"
        disabled={!canAddRow}
        onClick={() => updateGroupSettings(groupId, { rows: clampDimension(rows + 1) })}
        title={t('editor.gridAddRow')}
        aria-label={t('editor.gridAddRow')}
      >
        <RowsIcon size={14} />
        <PlusIcon size={11} className="grid-add-dimension-controls__plus" />
      </button>
      <button
        type="button"
        className="grid-add-dimension-controls__btn"
        disabled={!canAddCol}
        onClick={() => updateGroupSettings(groupId, { cols: clampDimension(cols + 1) })}
        title={t('editor.gridAddColumn')}
        aria-label={t('editor.gridAddColumn')}
      >
        <ColumnsIcon size={14} />
        <PlusIcon size={11} className="grid-add-dimension-controls__plus" />
      </button>
    </div>
  );
};
