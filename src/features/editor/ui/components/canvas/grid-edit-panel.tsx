import './grid-edit-panel.scss';

import { useTranslation } from 'react-i18next';
import {
  boundsFromGap,
  gapFromPitch,
  pitchFromBounds,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';

export type { GridEditSettings as GridToolSettings };

interface GridGroupPanelProps {
  settings: GridEditSettings;
  bounds: GridBounds;
  blockCount: number;
  onSettingsChange: (settings: Partial<GridEditSettings>) => void;
  onBoundsChange: (bounds: GridBounds) => void;
  compact?: boolean;
}

function clampDimension(value: number, min = 1, max = 20): number {
  return Math.min(max, Math.max(min, value));
}

export const GridGroupPanel = ({
  settings,
  bounds,
  blockCount,
  onSettingsChange,
  onBoundsChange,
  compact = false,
}: GridGroupPanelProps) => {
  const { t } = useTranslation();

  const pitch = pitchFromBounds(bounds, settings.cols, settings.rows);
  const gap = gapFromPitch(
    pitch,
    { width: settings.rectWidth, height: settings.rectHeight },
    settings.align,
  );

  const adjustCols = (delta: number) => {
    onSettingsChange({ cols: clampDimension(settings.cols + delta) });
  };

  const adjustRows = (delta: number) => {
    onSettingsChange({ rows: clampDimension(settings.rows + delta) });
  };

  const handleGapXChange = (gapX: number) => {
    onBoundsChange(
      boundsFromGap(
        bounds,
        settings.cols,
        settings.rows,
        { gapX: Math.max(0, gapX), gapY: gap.gapY },
        { width: settings.rectWidth, height: settings.rectHeight },
      ),
    );
  };

  const handleGapYChange = (gapY: number) => {
    onBoundsChange(
      boundsFromGap(
        bounds,
        settings.cols,
        settings.rows,
        { gapX: gap.gapX, gapY: Math.max(0, gapY) },
        { width: settings.rectWidth, height: settings.rectHeight },
      ),
    );
  };

  return (
    <div className={`grid-edit-panel${compact ? ' grid-edit-panel--compact' : ''}`}>
      <p className="grid-edit-panel__hint">{t('editor.gridGroupHint', { count: blockCount })}</p>
      <p className="grid-edit-panel__stretch-hint">{t('editor.gridGutterHint')}</p>

      <div className="grid-edit-panel__fields">
        <label className="grid-edit-panel__field">
          <span>{t('editor.gridGapX')}</span>
          <input
            type="number"
            min={0}
            value={gap.gapX}
            onChange={e => handleGapXChange(Number(e.target.value) || 0)}
          />
        </label>

        <label className="grid-edit-panel__field">
          <span>{t('editor.gridGapY')}</span>
          <input
            type="number"
            min={0}
            value={gap.gapY}
            onChange={e => handleGapYChange(Number(e.target.value) || 0)}
          />
        </label>

        <label className="grid-edit-panel__field">
          <span>{t('editor.gridPitchX')}</span>
          <input type="number" min={8} value={Math.round(pitch.pitchX)} readOnly />
        </label>

        <label className="grid-edit-panel__field">
          <span>{t('editor.gridPitchY')}</span>
          <input type="number" min={8} value={Math.round(pitch.pitchY)} readOnly />
        </label>

        {!compact && (
          <>
            <label className="grid-edit-panel__field">
              <span>{t('editor.gridColumns')}</span>
              <div className="grid-edit-panel__stepper">
                <button type="button" onClick={() => adjustCols(-1)} aria-label="-">
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.cols}
                  onChange={e => onSettingsChange({ cols: clampDimension(Number(e.target.value) || 1) })}
                />
                <button type="button" onClick={() => adjustCols(1)} aria-label="+">
                  +
                </button>
              </div>
            </label>

            <label className="grid-edit-panel__field">
              <span>{t('editor.gridRows')}</span>
              <div className="grid-edit-panel__stepper">
                <button type="button" onClick={() => adjustRows(-1)} aria-label="-">
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.rows}
                  onChange={e => onSettingsChange({ rows: clampDimension(Number(e.target.value) || 1) })}
                />
                <button type="button" onClick={() => adjustRows(1)} aria-label="+">
                  +
                </button>
              </div>
            </label>
          </>
        )}

        <label className="grid-edit-panel__field">
          <span>{t('editor.gridAlignment')}</span>
          <select
            value={settings.align}
            onChange={e => onSettingsChange({ align: e.target.value as GridEditSettings['align'] })}
          >
            <option value="top-left">{t('editor.gridAlignTopLeft')}</option>
            <option value="center">{t('editor.gridAlignCenter')}</option>
          </select>
        </label>

        <label className="grid-edit-panel__field">
          <span>{t('editor.gridBlockWidth')}</span>
          <input
            type="number"
            min={8}
            value={settings.rectWidth}
            onChange={e => onSettingsChange({ rectWidth: Math.max(8, Number(e.target.value) || 8) })}
          />
        </label>

        <label className="grid-edit-panel__field">
          <span>{t('editor.gridBlockHeight')}</span>
          <input
            type="number"
            min={8}
            value={settings.rectHeight}
            onChange={e => onSettingsChange({ rectHeight: Math.max(8, Number(e.target.value) || 8) })}
          />
        </label>
      </div>
    </div>
  );
};

/** @deprecated Use GridGroupPanel */
export const GridEditPanel = GridGroupPanel;
