import './grid-add-dimension-controls.scss';

import { useTranslation } from 'react-i18next';
import { ColumnsIcon, PlusIcon, RowsIcon } from '@/core/icons';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import type { GridBounds } from '@/features/editor/domain/services/grid-layout';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';

const MAX_DIMENSION = 20;
const OUTSET_PX = 6;

function clampDimension(value: number): number {
  return Math.min(MAX_DIMENSION, Math.max(1, value));
}

interface GridAddDimensionControlsProps {
  groupId: string;
  bounds: GridBounds;
  scale: number;
  offset: { x: number; y: number };
  cols: number;
  rows: number;
}

export const GridAddDimensionControls = ({
  groupId,
  bounds,
  scale,
  offset,
  cols,
  rows,
}: GridAddDimensionControlsProps) => {
  const { t } = useTranslation();
  const { updateGroupSettings } = useGridGroupOps();

  const left = offset.x + (bounds.x + bounds.width) * scale + OUTSET_PX;
  const top = offset.y + (bounds.y + bounds.height) * scale + OUTSET_PX;

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
