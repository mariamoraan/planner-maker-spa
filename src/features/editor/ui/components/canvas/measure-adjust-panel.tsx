import './measure-adjust-panel.scss';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  canApplyGridMeasureAdjust,
  computeMeasureAdjustMovesWithGrid,
  computeMeasureMetrics,
  getMovingAnchor,
  getMovingBlockIds,
  overlayDeltaToAdjustTarget,
  resolveAnchorPoint,
  type MeasureAnchor,
  type MeasureRect,
} from '@/features/editor/domain/services/measure-utils';

interface MeasureAdjustPanelProps {
  p1: MeasureAnchor;
  p2: MeasureAnchor;
  rectangles: MeasureRect[];
  selectedRectangleIds: string[];
  onApply: (moves: { id: string; x: number; y: number }[]) => void;
}

export const MeasureAdjustPanel = ({
  p1,
  p2,
  rectangles,
  selectedRectangleIds,
  onApply,
}: MeasureAdjustPanelProps) => {
  const { t } = useTranslation();
  const moving = getMovingAnchor(p1, p2);

  const p1Point = resolveAnchorPoint(p1, rectangles);
  const p2Point = resolveAnchorPoint(p2, rectangles);
  const metrics = computeMeasureMetrics(p1Point, p2Point);

  const [dx, setDx] = useState(String(Math.round(metrics.dx)));
  const [dy, setDy] = useState(String(Math.round(metrics.dy)));
  const movingIds = moving?.blockId
    ? getMovingBlockIds(moving.blockId, selectedRectangleIds)
    : [];
  const overlayDx = Number(dx);
  const overlayDy = Number(dy);
  const gridEligible =
    !Number.isNaN(overlayDx) &&
    !Number.isNaN(overlayDy) &&
    canApplyGridMeasureAdjust(movingIds, rectangles, overlayDx, overlayDy);
  const [applyToGrid, setApplyToGrid] = useState(gridEligible);

  useEffect(() => {
    setDx(String(Math.round(metrics.dx)));
    setDy(String(Math.round(metrics.dy)));
  }, [metrics.dx, metrics.dy, p1, p2, rectangles]);

  useEffect(() => {
    if (gridEligible) {
      setApplyToGrid(true);
    }
  }, [gridEligible]);

  if (!moving?.blockId) return null;

  const handleApply = () => {
    const overlayDx = Number(dx);
    const overlayDy = Number(dy);
    if (Number.isNaN(overlayDx) || Number.isNaN(overlayDy)) return;

    const { targetDx, targetDy } = overlayDeltaToAdjustTarget(p1, p2, overlayDx, overlayDy);
    const fixed = moving === p2 ? p1 : p2;
    const moves = computeMeasureAdjustMovesWithGrid(
      fixed,
      moving,
      movingIds,
      targetDx,
      targetDy,
      rectangles,
      { applyToGrid },
    );

    if (moves.length > 0) {
      onApply(moves);
    }
  };

  return (
    <div className="measure-adjust-panel">
      <p className="measure-adjust-panel__hint">
        {gridEligible && applyToGrid
          ? t('editor.measureGridAdjustHint', { count: movingIds.length })
          : t('editor.measureAdjustHint')}
      </p>
      {gridEligible && (
        <label className="measure-adjust-panel__grid-toggle">
          <input
            type="checkbox"
            checked={applyToGrid}
            onChange={event => setApplyToGrid(event.target.checked)}
          />
          <span>{t('editor.measureApplyToGrid')}</span>
        </label>
      )}
      <div className="measure-adjust-panel__fields">
        <label className="measure-adjust-panel__field">
          <span>{t('editor.measureAdjustDx')}</span>
          <input
            type="number"
            value={dx}
            onChange={e => setDx(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
        </label>
        <label className="measure-adjust-panel__field">
          <span>{t('editor.measureAdjustDy')}</span>
          <input
            type="number"
            value={dy}
            onChange={e => setDy(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
        </label>
        <button type="button" className="measure-adjust-panel__apply" onClick={handleApply}>
          {gridEligible && applyToGrid
            ? t('editor.measureApplyGrid')
            : t('editor.measureApply')}
        </button>
      </div>
    </div>
  );
};
