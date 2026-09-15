import type { SnapGuide } from '@/features/editor/domain/services/canvas-snap';
import type { DragAxisLock } from '@/features/editor/domain/services/drag-axis-lock';

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragStartEntry {
  id: string;
  x: number;
  y: number;
}

export interface DragOverlay {
  guides: SnapGuide[];
  previewPositions: Record<string, { x: number; y: number }>;
  delta: { dx: number; dy: number };
}

export interface DragState {
  leaderId: string;
  movingIds: string[];
}

export const CANVAS_PADDING = 16;

export function filterSnapGuidesForAxisLock(
  guides: SnapGuide[],
  lock: DragAxisLock,
): SnapGuide[] {
  const allowed =
    lock === 'x'
      ? new Set<SnapGuide['type']>(['align-x', 'distance-h', 'spacing-h'])
      : new Set<SnapGuide['type']>(['align-y', 'distance-v', 'spacing-v']);
  return guides.filter(guide => allowed.has(guide.type));
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}
