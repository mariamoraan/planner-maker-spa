export type DragAxisLock = 'x' | 'y';

export function resolveDragAxisLock(
  dx: number,
  dy: number,
  shiftKey: boolean,
  currentLock: DragAxisLock | null,
): { dx: number; dy: number; lock: DragAxisLock | null } {
  if (!shiftKey) {
    return { dx, dy, lock: null };
  }

  const lock = currentLock ?? (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y');

  return {
    dx: lock === 'x' ? dx : 0,
    dy: lock === 'y' ? dy : 0,
    lock,
  };
}
