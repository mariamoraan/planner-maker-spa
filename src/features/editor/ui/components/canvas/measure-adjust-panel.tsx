import './measure-adjust-panel.scss';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  computeMeasureAdjustMoves,
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

  useEffect(() => {
    setDx(String(Math.round(metrics.dx)));
    setDy(String(Math.round(metrics.dy)));
  }, [metrics.dx, metrics.dy, p1, p2, rectangles]);

  if (!moving?.blockId) return null;

  const handleApply = () => {
    const overlayDx = Number(dx);
    const overlayDy = Number(dy);
    if (Number.isNaN(overlayDx) || Number.isNaN(overlayDy)) return;

    const { targetDx, targetDy } = overlayDeltaToAdjustTarget(p1, p2, overlayDx, overlayDy);
    const fixed = moving === p2 ? p1 : p2;
    const movingIds = getMovingBlockIds(moving.blockId, selectedRectangleIds);
    const moves = computeMeasureAdjustMoves(
      fixed,
      moving,
      movingIds,
      targetDx,
      targetDy,
      rectangles,
    );

    if (moves.length > 0) {
      onApply(moves);
    }
  };

  return (
    <div className="measure-adjust-panel">
      <p className="measure-adjust-panel__hint">{t('editor.measureAdjustHint')}</p>
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
          {t('editor.measureApply')}
        </button>
      </div>
    </div>
  );
};
