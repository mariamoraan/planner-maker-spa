import './selection-action-handles.scss';

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Move, RotateCcw } from 'lucide-react';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import {
  aabbFromRects,
  angleFromCenter,
  formatRotationDegrees,
  KEY_ROTATION_ANGLES,
  normalizeRotation,
  resolveWorldRect,
  shortestRotationDelta,
  snapToKeyRotation,
  type AxisAlignedBounds,
} from '@/features/editor/domain/services/block-geometry';
import { translateGridBounds } from '@/features/editor/domain/services/grid-layout';
import { getGridGroupForSelection } from '@/features/editor/domain/services/grid-group';
import {
  calendarRoleLabelKey,
  resolveEffectiveBindingSource,
} from '@/features/editor/domain/services/binding-group';
import type { TemplateImage } from '@/features/template';
import type { DragOverlay } from './canvas-interaction-types';

const BUTTON_SIZE = 32;
const BUTTON_GAP = 8;
const OUTSET = 14;
const EDGE_PAD = 8;
const CLUSTER_WIDTH = BUTTON_SIZE * 2 + BUTTON_GAP;
const CLUSTER_HEIGHT = BUTTON_SIZE;

function clampClusterPosition(
  preferredLeft: number,
  preferredTop: number,
  stageSize: { width: number; height: number },
  anchor: AxisAlignedBounds,
): { left: number; top: number } {
  let left = preferredLeft;
  let top = preferredTop;

  if (top + CLUSTER_HEIGHT + EDGE_PAD > stageSize.height) {
    top = anchor.y - OUTSET - CLUSTER_HEIGHT;
  }

  const maxTop = Math.max(EDGE_PAD, stageSize.height - CLUSTER_HEIGHT - EDGE_PAD);
  top = Math.min(Math.max(top, EDGE_PAD), maxTop);

  const maxLeft = Math.max(EDGE_PAD, stageSize.width - CLUSTER_WIDTH - EDGE_PAD);
  left = Math.min(Math.max(left, EDGE_PAD), maxLeft);

  return { left, top };
}

interface SelectionActionHandlesProps {
  currentImage: TemplateImage;
  selectedRectangleIds: string[];
  isSelectMode: boolean;
  scale: number;
  offset: { x: number; y: number };
  stageSize: { width: number; height: number };
  dragOverlay: DragOverlay | null;
  pointerToImage: (pos: { x: number; y: number }) => { x: number; y: number };
  getStageElement: () => HTMLElement | null;
  onRotateCommit: (payload: {
    kind: 'rect' | 'grid';
    id: string;
    rotation: number;
  }) => void;
  onMoveStart: (leaderId: string) => void;
  onMoveUpdate: (totalDx: number, totalDy: number, shiftKey: boolean) => void;
  onMoveEnd: () => void;
  rotationPreview: number | null;
  onRotationPreview: (rotation: number | null) => void;
}

export const SelectionActionHandles = ({
  currentImage,
  selectedRectangleIds,
  isSelectMode,
  scale,
  offset,
  stageSize,
  dragOverlay,
  pointerToImage,
  getStageElement,
  onRotateCommit,
  onMoveStart,
  onMoveUpdate,
  onMoveEnd,
  rotationPreview,
  onRotationPreview,
}: SelectionActionHandlesProps) => {
  const { t } = useTranslation();
  const rotateSessionRef = useRef<{
    kind: 'rect' | 'grid';
    id: string;
    center: { x: number; y: number };
    startAngle: number;
    startRotation: number;
  } | null>(null);
  const moveSessionRef = useRef<{
    startImage: { x: number; y: number };
    leaderId: string;
  } | null>(null);
  const [, setIsInteracting] = useState(false);

  const selectedRects =
    currentImage.rectangles?.filter(rect => selectedRectangleIds.includes(rect.id)) ?? [];

  const lockedGrid = getGridGroupForSelection(selectedRectangleIds, currentImage.gridGroups);

  const worldRects = selectedRects.map(rect => {
    const previewPosition = dragOverlay?.previewPositions[rect.id];
    const groupBoundsOverride =
      lockedGrid && dragOverlay?.delta
        ? translateGridBounds(lockedGrid.bounds, dragOverlay.delta.dx, dragOverlay.delta.dy)
        : undefined;

    if (rotationPreview !== null && lockedGrid) {
      return resolveWorldRect(
        rect,
        {
          ...currentImage.gridGroups,
          [lockedGrid.id]: { ...lockedGrid, rotation: rotationPreview },
        },
        { previewPosition, groupBoundsOverride },
      );
    }

    const base = resolveWorldRect(rect, currentImage.gridGroups, {
      previewPosition,
      groupBoundsOverride,
    });

    if (rotationPreview !== null && !lockedGrid && selectedRects.length === 1) {
      return { ...base, rotation: rotationPreview };
    }

    return base;
  });

  const aabb = aabbFromRects(worldRects);

  const resolveStagePoint = useCallback((event: PointerEvent, stageEl: HTMLElement | null) => {
    if (!stageEl) return null;
    const rect = stageEl.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  if (!isSelectMode || !aabb || selectedRects.length === 0) {
    return null;
  }

  const stageAabb = {
    x: offset.x + aabb.x * scale,
    y: offset.y + aabb.y * scale,
    width: aabb.width * scale,
    height: aabb.height * scale,
  };

  const preferredLeft = stageAabb.x + stageAabb.width / 2 - CLUSTER_WIDTH / 2;
  const preferredTop = stageAabb.y + stageAabb.height + OUTSET;
  const { left, top } = clampClusterPosition(preferredLeft, preferredTop, stageSize, stageAabb);

  const targetKind: 'rect' | 'grid' = lockedGrid ? 'grid' : 'rect';
  const targetId = lockedGrid?.id ?? selectedRects[0]?.id;
  if (!targetId) return null;

  const canRotate = Boolean(lockedGrid) || selectedRects.length === 1;
  const baseRotation = lockedGrid
    ? (lockedGrid.rotation ?? 0)
    : (selectedRects[0]?.rotation ?? 0);

  const resolveLiveRotation = (
    session: NonNullable<typeof rotateSessionRef.current>,
    imagePos: { x: number; y: number },
    shiftKey: boolean,
  ) => {
    const delta = shortestRotationDelta(
      session.startAngle,
      angleFromCenter(session.center, imagePos),
    );
    const raw = session.startRotation + delta;
    if (shiftKey) {
      return normalizeRotation(Math.round(raw / 15) * 15);
    }
    return snapToKeyRotation(raw).rotation;
  };

  const isKeyAngle =
    rotationPreview !== null &&
    KEY_ROTATION_ANGLES.some(
      key => Math.abs(shortestRotationDelta(rotationPreview, key)) < 0.05,
    );

  const beginRotate = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!canRotate) return;
    event.preventDefault();
    event.stopPropagation();
    const stageEl = getStageElement();
    const stagePoint = resolveStagePoint(event.nativeEvent, stageEl);
    if (!stagePoint) return;

    const imagePos = pointerToImage(stagePoint);
    const center = {
      x: aabb.x + aabb.width / 2,
      y: aabb.y + aabb.height / 2,
    };

    rotateSessionRef.current = {
      kind: targetKind,
      id: targetId,
      center,
      startAngle: angleFromCenter(center, imagePos),
      startRotation: baseRotation,
    };
    setIsInteracting(true);
    onRotationPreview(snapToKeyRotation(baseRotation).rotation);

    const onMove = (moveEvent: PointerEvent) => {
      const session = rotateSessionRef.current;
      if (!session) return;
      const pt = resolveStagePoint(moveEvent, stageEl);
      if (!pt) return;
      onRotationPreview(resolveLiveRotation(session, pointerToImage(pt), moveEvent.shiftKey));
    };

    const onUp = (upEvent: PointerEvent) => {
      const session = rotateSessionRef.current;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      rotateSessionRef.current = null;
      setIsInteracting(false);

      if (!session) {
        onRotationPreview(null);
        return;
      }

      const pt = resolveStagePoint(upEvent, stageEl);
      const nextRotation = pt
        ? resolveLiveRotation(session, pointerToImage(pt), upEvent.shiftKey)
        : normalizeRotation(session.startRotation);
      onRotationPreview(null);
      onRotateCommit({ kind: session.kind, id: session.id, rotation: nextRotation });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const beginMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const stageEl = getStageElement();
    const stagePoint = resolveStagePoint(event.nativeEvent, stageEl);
    if (!stagePoint) return;

    const leaderId = lockedGrid
      ? (lockedGrid.rectIds[0] ?? selectedRects[0].id)
      : selectedRects[0].id;
    const imagePos = pointerToImage(stagePoint);
    moveSessionRef.current = { startImage: imagePos, leaderId };
    setIsInteracting(true);
    onMoveStart(leaderId);

    const onMove = (moveEvent: PointerEvent) => {
      const session = moveSessionRef.current;
      if (!session) return;
      const pt = resolveStagePoint(moveEvent, stageEl);
      if (!pt) return;
      const img = pointerToImage(pt);
      onMoveUpdate(img.x - session.startImage.x, img.y - session.startImage.y, moveEvent.shiftKey);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      moveSessionRef.current = null;
      setIsInteracting(false);
      onMoveEnd();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  let calendarBadge: string | null = null;
  if (lockedGrid) {
    const representative = selectedRects[0];
    if (representative) {
      const source = resolveEffectiveBindingSource(representative, currentImage);
      if (source !== 'page') {
        calendarBadge = t(calendarRoleLabelKey(source));
      }
    }
  }

  return (
    <div
      className="selection-action-handles"
      style={{ left, top }}
      {...blockSelectionZoneProps}
    >
      {calendarBadge && rotationPreview === null ? (
        <div className="selection-action-handles__calendar-badge" aria-live="polite">
          {calendarBadge}
        </div>
      ) : null}
      {rotationPreview !== null && (
        <div
          className={[
            'selection-action-handles__angle',
            isKeyAngle ? 'selection-action-handles__angle--snapped' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
        >
          {formatRotationDegrees(rotationPreview)}
        </div>
      )}
      {canRotate && (
        <button
          type="button"
          className="selection-action-handles__btn selection-action-handles__btn--rotate"
          title={t('editor.rotateBlock')}
          aria-label={t('editor.rotateBlock')}
          onPointerDown={beginRotate}
        >
          <RotateCcw size={16} strokeWidth={2.25} />
        </button>
      )}
      <button
        type="button"
        className="selection-action-handles__btn selection-action-handles__btn--move"
        title={t('editor.moveBlock')}
        aria-label={t('editor.moveBlock')}
        onPointerDown={beginMove}
      >
        <Move size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
};
