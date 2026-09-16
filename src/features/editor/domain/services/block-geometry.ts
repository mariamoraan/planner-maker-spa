/** Normalize degrees to (-180, 180]. */
export function normalizeRotation(degrees: number): number {
  let value = degrees % 360;
  if (value > 180) value -= 360;
  if (value <= -180) value += 360;
  return value;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export interface AxisAlignedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OrientedRect extends AxisAlignedBounds {
  rotation?: number;
}

/** Top-left of an unrotated rect from its center. */
export function topLeftFromCenter(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
  };
}

export function rectCenter(rect: Pick<AxisAlignedBounds, 'x' | 'y' | 'width' | 'height'>): {
  x: number;
  y: number;
} {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function rotatePointAround(
  point: { x: number; y: number },
  center: { x: number; y: number },
  degrees: number,
): { x: number; y: number } {
  if (!degrees) return { ...point };
  const rad = degToRad(degrees);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Axis-aligned bounding box of a possibly rotated rectangle. */
export function orientedRectAabb(rect: OrientedRect): AxisAlignedBounds {
  const rotation = rect.rotation ?? 0;
  if (!rotation) {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  const center = rectCenter(rect);
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ].map(corner => rotatePointAround(corner, center, rotation));

  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function aabbFromRects(rects: OrientedRect[]): AxisAlignedBounds | null {
  if (rects.length === 0) return null;

  const boxes = rects.map(orientedRectAabb);
  const minX = Math.min(...boxes.map(b => b.x));
  const minY = Math.min(...boxes.map(b => b.y));
  const maxX = Math.max(...boxes.map(b => b.x + b.width));
  const maxY = Math.max(...boxes.map(b => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Point-in-rect test in the rectangle's local (unrotated) space. */
export function pointInOrientedRect(
  point: { x: number; y: number },
  rect: OrientedRect,
): boolean {
  const rotation = rect.rotation ?? 0;
  if (!rotation) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  const center = rectCenter(rect);
  const local = rotatePointAround(point, center, -rotation);
  return (
    local.x >= rect.x &&
    local.x <= rect.x + rect.width &&
    local.y >= rect.y &&
    local.y <= rect.y + rect.height
  );
}

/**
 * Angle from rect center to pointer, in degrees (Konva / screen Y-down).
 * 0° points right; useful for drag-rotate deltas.
 */
export function angleFromCenter(
  center: { x: number; y: number },
  point: { x: number; y: number },
): number {
  return radToDeg(Math.atan2(point.y - center.y, point.x - center.x));
}

export function shortestRotationDelta(fromDeg: number, toDeg: number): number {
  return normalizeRotation(toDeg - fromDeg);
}

/** Resolve a rectangle's on-canvas pose, including parent grid rotation. */
export function resolveWorldRect(
  rect: OrientedRect & { gridGroupId?: string; id?: string },
  gridGroups?: Record<string, { bounds: AxisAlignedBounds; rotation?: number }>,
  options?: {
    previewPosition?: { x: number; y: number };
    /** When the grid is mid-drag, pass translated bounds center via delta. */
    groupBoundsOverride?: AxisAlignedBounds;
  },
): OrientedRect {
  const localX = options?.previewPosition?.x ?? rect.x;
  const localY = options?.previewPosition?.y ?? rect.y;
  const ownRotation = rect.rotation ?? 0;
  const groupId = rect.gridGroupId;
  const group = groupId ? gridGroups?.[groupId] : undefined;
  const groupRotation = group?.rotation ?? 0;

  if (!group || !groupRotation) {
    return {
      x: localX,
      y: localY,
      width: rect.width,
      height: rect.height,
      rotation: ownRotation,
    };
  }

  const bounds = options?.groupBoundsOverride ?? group.bounds;
  const groupCenter = rectCenter(bounds);
  const localCenter = {
    x: localX + rect.width / 2,
    y: localY + rect.height / 2,
  };
  const worldCenter = rotatePointAround(localCenter, groupCenter, groupRotation);

  return {
    x: worldCenter.x - rect.width / 2,
    y: worldCenter.y - rect.height / 2,
    width: rect.width,
    height: rect.height,
    rotation: normalizeRotation(groupRotation + ownRotation),
  };
}
