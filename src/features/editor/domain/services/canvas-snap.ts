export interface RectBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SnapGuideType =
  | 'align-x'
  | 'align-y'
  | 'distance-h'
  | 'distance-v'
  | 'spacing-h'
  | 'spacing-v';

export interface SnapGuide {
  type: SnapGuideType;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  label?: string;
  labelX?: number;
  labelY?: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapOptions {
  /** When dragging a group, snap using this bbox instead of the leader rect. */
  snapTarget?: { x: number; y: number; width: number; height: number };
  /** Page bounds for edge/center snapping. */
  canvasBounds?: { width: number; height: number };
  /** When false, return raw position without snapping. */
  enabled?: boolean;
}

export interface GroupMember {
  id: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
}

const CANVAS_SNAP_ID = '__canvas__';

/** Round a coordinate to the nearest integer pixel. */
export function normalizeCoord(value: number): number {
  return Math.round(value);
}

export function sanitizeRectangleGeometry(
  rect: { x?: number; y?: number; width?: number; height?: number },
): { x?: number; y?: number; width?: number; height?: number } {
  const sanitized = { ...rect };
  if (sanitized.x !== undefined) sanitized.x = Math.round(sanitized.x);
  if (sanitized.y !== undefined) sanitized.y = Math.round(sanitized.y);
  if (sanitized.width !== undefined) sanitized.width = Math.round(sanitized.width);
  if (sanitized.height !== undefined) sanitized.height = Math.round(sanitized.height);
  return sanitized;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function canonicalGap(gaps: number[]): number {
  const positive = gaps.filter(gap => gap > 0).map(gap => Math.round(gap));
  if (positive.length === 0) return 0;
  return median(positive);
}

function normalizeBounds(rect: RectBounds): RectBounds {
  return {
    ...rect,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

const EDGE_ALIGN_THRESHOLD = 4;
const ADJACENT_SNAP_THRESHOLD = 2;
const SPACING_SNAP_THRESHOLD = 3;
const CENTER_SNAP_THRESHOLD = 2;
const MAX_DISTANCE_LABEL = 300;
const MAX_CHAIN_GAP = 120;
const EDGE_ALIGN_TOLERANCE = 8;
const MIN_OVERLAP_RATIO = 0.25;
const SPACING_PRIORITY_BOOST = 0.95;

type AlignCheckKind = 'edge' | 'adjacent' | 'center';

function edgeThreshold(scale: number): number {
  return EDGE_ALIGN_THRESHOLD / scale;
}

function adjacentThreshold(scale: number): number {
  return ADJACENT_SNAP_THRESHOLD / scale;
}

function centerThreshold(scale: number): number {
  return CENTER_SNAP_THRESHOLD / scale;
}

function spacingThreshold(scale: number): number {
  return SPACING_SNAP_THRESHOLD / scale;
}

function alignCheckThreshold(kind: AlignCheckKind, scale: number): number {
  switch (kind) {
    case 'edge':
      return edgeThreshold(scale);
    case 'adjacent':
      return adjacentThreshold(scale);
    case 'center':
      return centerThreshold(scale);
  }
}

function edges(x: number, y: number, width: number, height: number) {
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMin < bMax && bMin < aMax;
}

function sameRow(a: RectBounds, b: RectBounds): boolean {
  const bandTolerance = Math.min(a.height, b.height) * 0.5;
  const aCenterY = a.y + a.height / 2;
  const bCenterY = b.y + b.height / 2;
  return (
    rangesOverlap(a.y, a.y + a.height, b.y, b.y + b.height) ||
    Math.abs(aCenterY - bCenterY) <= bandTolerance
  );
}

function sameColumn(a: RectBounds, b: RectBounds): boolean {
  const bandTolerance = Math.min(a.width, b.width) * 0.5;
  const aCenterX = a.x + a.width / 2;
  const bCenterX = b.x + b.width / 2;
  return (
    rangesOverlap(a.x, a.x + a.width, b.x, b.x + b.width) ||
    Math.abs(aCenterX - bCenterX) <= bandTolerance
  );
}

function horizontalOverlapRatio(a: RectBounds, b: RectBounds): number {
  const overlapStart = Math.max(a.x, b.x);
  const overlapEnd = Math.min(a.x + a.width, b.x + b.width);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const minWidth = Math.min(a.width, b.width);
  if (minWidth <= 0) return 0;
  return overlap / minWidth;
}

function verticalOverlapRatio(a: RectBounds, b: RectBounds): number {
  const overlapStart = Math.max(a.y, b.y);
  const overlapEnd = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const minHeight = Math.min(a.height, b.height);
  if (minHeight <= 0) return 0;
  return overlap / minHeight;
}

function sameColumnForDistance(a: RectBounds, b: RectBounds): boolean {
  if (sameColumn(a, b)) return true;
  if (horizontalOverlapRatio(a, b) >= MIN_OVERLAP_RATIO) return true;
  if (Math.abs(a.x - b.x) <= EDGE_ALIGN_TOLERANCE) return true;
  if (Math.abs(a.x + a.width - (b.x + b.width)) <= EDGE_ALIGN_TOLERANCE) return true;
  return false;
}

function sameRowForDistance(a: RectBounds, b: RectBounds): boolean {
  if (sameRow(a, b)) return true;
  if (verticalOverlapRatio(a, b) >= MIN_OVERLAP_RATIO) return true;
  if (Math.abs(a.y - b.y) <= EDGE_ALIGN_TOLERANCE) return true;
  if (Math.abs(a.y + a.height - (b.y + b.height)) <= EDGE_ALIGN_TOLERANCE) return true;
  return false;
}

function gapBetween(a: RectBounds, b: RectBounds, axis: 'x' | 'y'): number {
  if (axis === 'x') {
    return Math.round(b.x - (a.x + a.width));
  }
  return Math.round(b.y - (a.y + a.height));
}

function splitChainByGap(chain: RectBounds[], axis: 'x' | 'y'): RectBounds[][] {
  if (chain.length <= 1) return [chain];

  const positiveGaps: number[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const gap = gapBetween(chain[i], chain[i + 1], axis);
    if (gap > 0) positiveGaps.push(gap);
  }

  const minGap = positiveGaps.length > 0 ? Math.min(...positiveGaps) : MAX_CHAIN_GAP;
  const threshold = Math.max(MAX_CHAIN_GAP, 3 * minGap);

  const subchains: RectBounds[][] = [];
  let current: RectBounds[] = [chain[0]];

  for (let i = 0; i < chain.length - 1; i++) {
    const gap = gapBetween(chain[i], chain[i + 1], axis);
    if (gap > threshold) {
      subchains.push(current);
      current = [chain[i + 1]];
    } else {
      current.push(chain[i + 1]);
    }
  }
  subchains.push(current);

  return subchains;
}

function chainGaps(chain: RectBounds[], axis: 'x' | 'y'): number[] {
  const gaps: number[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const gap = gapBetween(chain[i], chain[i + 1], axis);
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
}

function gapsForChain(chain: RectBounds[], axis: 'x' | 'y'): number[] {
  const gaps = chainGaps(chain, axis);
  if (gaps.length < 3 || chain.length < 4) return gaps;

  const min = Math.min(...gaps);
  const max = Math.max(...gaps);
  if (max - min <= 2) return gaps;

  const canonical = canonicalGap(gaps);
  return canonical > 0 ? [canonical] : gaps;
}

function gapsForSnapBelow(chain: RectBounds[], index: number, axis: 'x' | 'y'): number[] {
  const chainGapsResolved = gapsForChain(chain, axis);
  if (index < chain.length - 1) {
    const gap = gapBetween(chain[index], chain[index + 1], axis);
    if (gap > 0 && chainGapsResolved.length === 1) return chainGapsResolved;
    return gap > 0 ? [gap] : [];
  }
  if (index > 0) {
    const gap = gapBetween(chain[index - 1], chain[index], axis);
    if (gap > 0 && chainGapsResolved.length === 1) return chainGapsResolved;
    return gap > 0 ? [gap] : [];
  }
  return [];
}

function gapsForSnapAbove(chain: RectBounds[], index: number, axis: 'x' | 'y'): number[] {
  const chainGapsResolved = gapsForChain(chain, axis);
  if (index > 0) {
    const gap = gapBetween(chain[index - 1], chain[index], axis);
    if (gap > 0 && chainGapsResolved.length === 1) return chainGapsResolved;
    return gap > 0 ? [gap] : [];
  }
  if (index < chain.length - 1) {
    const gap = gapBetween(chain[index], chain[index + 1], axis);
    if (gap > 0 && chainGapsResolved.length === 1) return chainGapsResolved;
    return gap > 0 ? [gap] : [];
  }
  return [];
}

interface SnapCandidate {
  axis: 'x' | 'y';
  delta: number;
  guides: SnapGuide[];
  kind: 'align' | 'spacing';
  chainLength: number;
}

function alignGuideX(
  lineX: number,
  snapY: number,
  snapH: number,
  other: RectBounds,
): SnapGuide {
  const m = edges(0, snapY, 0, snapH);
  const o = edges(other.x, other.y, other.width, other.height);
  const minY = Math.min(snapY, snapY + snapH, o.top, o.bottom);
  const maxY = Math.max(snapY, snapY + snapH, o.top, o.bottom);
  return { type: 'align-x', x: lineX, y1: minY, y2: maxY };
}

function alignGuideY(
  lineY: number,
  snapX: number,
  snapW: number,
  other: RectBounds,
): SnapGuide {
  const m = edges(snapX, 0, snapW, 0);
  const o = edges(other.x, other.y, other.width, other.height);
  const minX = Math.min(snapX, snapX + snapW, o.left, o.right);
  const maxX = Math.max(snapX, snapX + snapW, o.left, o.right);
  return { type: 'align-y', y: lineY, x1: minX, x2: maxX };
}

function collectAlignmentCandidates(
  snapX: number,
  snapY: number,
  snapW: number,
  snapH: number,
  others: RectBounds[],
  scale: number,
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];

  for (const other of others) {
    const o = edges(other.x, other.y, other.width, other.height);
    const isCanvas = other.id === CANVAS_SNAP_ID;

    const xChecks: { snapX: number; lineX: number; kind: AlignCheckKind }[] = [
      { snapX: o.left, lineX: o.left, kind: 'edge' },
      { snapX: o.right - snapW, lineX: o.right, kind: 'edge' },
      ...(isCanvas
        ? [{ snapX: o.centerX - snapW / 2, lineX: o.centerX, kind: 'center' as AlignCheckKind }]
        : []),
      { snapX: o.right, lineX: o.right, kind: 'adjacent' },
      { snapX: o.left - snapW, lineX: o.left, kind: 'adjacent' },
    ];

    for (const check of xChecks) {
      const delta = check.snapX - snapX;
      const checkThreshold = alignCheckThreshold(check.kind, scale);
      if (Math.abs(delta) < checkThreshold) {
        candidates.push({
          axis: 'x',
          delta,
          kind: 'align',
          chainLength: 0,
          guides: [alignGuideX(check.lineX, snapY, snapH, other)],
        });
      }
    }

    const yChecks: { snapY: number; lineY: number; kind: AlignCheckKind }[] = [
      { snapY: o.top, lineY: o.top, kind: 'edge' },
      { snapY: o.bottom - snapH, lineY: o.bottom, kind: 'edge' },
      ...(isCanvas
        ? [{ snapY: o.centerY - snapH / 2, lineY: o.centerY, kind: 'center' as AlignCheckKind }]
        : []),
      { snapY: o.bottom, lineY: o.bottom, kind: 'adjacent' },
      { snapY: o.top - snapH, lineY: o.top, kind: 'adjacent' },
    ];

    for (const check of yChecks) {
      const delta = check.snapY - snapY;
      const checkThreshold = alignCheckThreshold(check.kind, scale);
      if (Math.abs(delta) < checkThreshold) {
        candidates.push({
          axis: 'y',
          delta,
          kind: 'align',
          chainLength: 0,
          guides: [alignGuideY(check.lineY, snapX, snapW, other)],
        });
      }
    }
  }

  return candidates;
}

function buildRowChains(rects: RectBounds[]): RectBounds[][] {
  const layoutRects = rects.filter(r => r.id !== CANVAS_SNAP_ID);
  const chains: RectBounds[][] = [];
  const used = new Set<string>();

  for (const seed of layoutRects) {
    if (used.has(seed.id)) continue;
    const chain = layoutRects
      .filter(r => !used.has(r.id) && sameRow(seed, r))
      .sort((a, b) => a.x - b.x);
    if (chain.length === 0) continue;
    chain.forEach(r => used.add(r.id));
    chains.push(...splitChainByGap(chain, 'x'));
  }

  return chains;
}

function buildColumnChains(rects: RectBounds[]): RectBounds[][] {
  const layoutRects = rects.filter(r => r.id !== CANVAS_SNAP_ID);
  const chains: RectBounds[][] = [];
  const used = new Set<string>();

  for (const seed of layoutRects) {
    if (used.has(seed.id)) continue;
    const chain = layoutRects
      .filter(r => !used.has(r.id) && sameColumn(seed, r))
      .sort((a, b) => a.y - b.y);
    if (chain.length === 0) continue;
    chain.forEach(r => used.add(r.id));
    chains.push(...splitChainByGap(chain, 'y'));
  }

  return chains;
}

function spacingHGuide(x1: number, x2: number, y: number, label?: string): SnapGuide {
  const gap = Math.abs(x2 - x1);
  return {
    type: 'spacing-h',
    x1,
    x2,
    y,
    label: label ?? `${Math.round(gap)}`,
    labelX: (x1 + x2) / 2,
    labelY: y,
  };
}

function spacingVGuide(y1: number, y2: number, x: number, label?: string): SnapGuide {
  const gap = Math.abs(y2 - y1);
  return {
    type: 'spacing-v',
    y1,
    y2,
    x,
    label: label ?? `${Math.round(gap)}`,
    labelX: x,
    labelY: (y1 + y2) / 2,
  };
}

function rowGuideY(chain: RectBounds[], snapY: number, snapH: number): number {
  const snapCenter = snapY + snapH / 2;
  for (const rect of chain) {
    if (rangesOverlap(snapY, snapY + snapH, rect.y, rect.y + rect.height)) {
      return rect.y + rect.height / 2;
    }
  }
  let best = chain[0].y + chain[0].height / 2;
  let bestDist = Math.abs(snapCenter - best);
  for (const rect of chain) {
    const cy = rect.y + rect.height / 2;
    const dist = Math.abs(snapCenter - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = cy;
    }
  }
  return best;
}

function columnGuideX(chain: RectBounds[], snapX: number, snapW: number): number {
  const snapCenter = snapX + snapW / 2;
  for (const rect of chain) {
    if (rangesOverlap(snapX, snapX + snapW, rect.x, rect.x + rect.width)) {
      return rect.x + rect.width / 2;
    }
  }
  let best = chain[0].x + chain[0].width / 2;
  let bestDist = Math.abs(snapCenter - best);
  for (const rect of chain) {
    const cx = rect.x + rect.width / 2;
    const dist = Math.abs(snapCenter - cx);
    if (dist < bestDist) {
      bestDist = dist;
      best = cx;
    }
  }
  return best;
}

function collectSpacingCandidates(
  snapX: number,
  snapY: number,
  snapW: number,
  snapH: number,
  others: RectBounds[],
  scale: number,
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];
  const t = spacingThreshold(scale);
  const gapLabel = (g: number) => `${Math.round(g)}`;

  for (const chain of buildRowChains(others)) {
    if (chain.length < 1) continue;
    const guideY = rowGuideY(chain, snapY, snapH);
    const chainLen = chain.length;

    const measuredGaps: { gap: number; left: RectBounds; right: RectBounds }[] = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const left = chain[i];
      const right = chain[i + 1];
      measuredGaps.push({
        gap: gapBetween(left, right, 'x'),
        left,
        right,
      });
    }

    for (let i = 0; i < chain.length; i++) {
      const ref = chain[i];

      for (const gap of gapsForSnapBelow(chain, i, 'x')) {
        const label = gapLabel(gap);
        const targetX = ref.x + ref.width + gap;
        const delta = targetX - snapX;
        if (Math.abs(delta) < t) {
          candidates.push({
            axis: 'x',
            delta,
            kind: 'spacing',
            chainLength: chainLen,
            guides: [spacingHGuide(ref.x + ref.width, targetX, guideY, label)],
          });
        }
      }

      for (const gap of gapsForSnapAbove(chain, i, 'x')) {
        const label = gapLabel(gap);
        const targetLeftX = ref.x - gap - snapW;
        const deltaLeft = targetLeftX - snapX;
        if (Math.abs(deltaLeft) < t) {
          candidates.push({
            axis: 'x',
            delta: deltaLeft,
            kind: 'spacing',
            chainLength: chainLen,
            guides: [spacingHGuide(targetLeftX + snapW, ref.x, guideY, label)],
          });
        }
      }
    }

    for (const { left, right, gap } of measuredGaps) {
      if (gap <= 0) continue;
      const label = gapLabel(gap);
      const betweenX = left.x + left.width + gap;
      const betweenDelta = betweenX - snapX;
      const fitsBetween =
        betweenX + snapW + gap <= right.x + t && betweenX + snapW <= right.x + t;
      if (fitsBetween && Math.abs(betweenDelta) < t) {
        const leftRight = left.x + left.width;
        const movingRight = betweenX + snapW;
        candidates.push({
          axis: 'x',
          delta: betweenDelta,
          kind: 'spacing',
          chainLength: chainLen,
          guides: [
            spacingHGuide(leftRight, betweenX, guideY, label),
            spacingHGuide(movingRight, right.x, guideY, label),
          ],
        });
      }
    }
  }

  for (const chain of buildColumnChains(others)) {
    if (chain.length < 1) continue;
    const guideX = columnGuideX(chain, snapX, snapW);
    const chainLen = chain.length;

    const measuredGaps: { gap: number; top: RectBounds; bottom: RectBounds }[] = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const top = chain[i];
      const bottom = chain[i + 1];
      measuredGaps.push({
        gap: gapBetween(top, bottom, 'y'),
        top,
        bottom,
      });
    }

    for (let i = 0; i < chain.length; i++) {
      const ref = chain[i];

      for (const gap of gapsForSnapBelow(chain, i, 'y')) {
        const label = gapLabel(gap);
        const targetY = ref.y + ref.height + gap;
        const delta = targetY - snapY;
        if (Math.abs(delta) < t) {
          candidates.push({
            axis: 'y',
            delta,
            kind: 'spacing',
            chainLength: chainLen,
            guides: [spacingVGuide(ref.y + ref.height, targetY, guideX, label)],
          });
        }
      }

      for (const gap of gapsForSnapAbove(chain, i, 'y')) {
        const label = gapLabel(gap);
        const targetAboveY = ref.y - gap - snapH;
        const deltaAbove = targetAboveY - snapY;
        if (Math.abs(deltaAbove) < t) {
          candidates.push({
            axis: 'y',
            delta: deltaAbove,
            kind: 'spacing',
            chainLength: chainLen,
            guides: [spacingVGuide(targetAboveY + snapH, ref.y, guideX, label)],
          });
        }
      }
    }

    for (const { top, bottom, gap } of measuredGaps) {
      if (gap <= 0) continue;
      const label = gapLabel(gap);
      const betweenY = top.y + top.height + gap;
      const betweenDelta = betweenY - snapY;
      const fitsBetween =
        betweenY + snapH + gap <= bottom.y + t && betweenY + snapH <= bottom.y + t;
      if (fitsBetween && Math.abs(betweenDelta) < t) {
        const topBottom = top.y + top.height;
        const movingBottom = betweenY + snapH;
        candidates.push({
          axis: 'y',
          delta: betweenDelta,
          kind: 'spacing',
          chainLength: chainLen,
          guides: [
            spacingVGuide(topBottom, betweenY, guideX, label),
            spacingVGuide(movingBottom, bottom.y, guideX, label),
          ],
        });
      }
    }
  }

  return candidates;
}

function candidateScore(candidate: SnapCandidate): number {
  const base = Math.abs(candidate.delta);
  if (candidate.kind === 'spacing' && candidate.chainLength >= 2) {
    return base * SPACING_PRIORITY_BOOST;
  }
  if (candidate.kind === 'spacing' && candidate.chainLength >= 1) {
    return base * 0.92;
  }
  return base;
}

function pickBestCandidate(candidates: SnapCandidate[], axis: 'x' | 'y'): SnapCandidate | null {
  const filtered = candidates.filter(c => c.axis === axis);
  if (filtered.length === 0) return null;

  return filtered.reduce((best, c) => {
    const bestScore = candidateScore(best);
    const cScore = candidateScore(c);
    if (cScore < bestScore) return c;
    if (cScore > bestScore) return best;
    if (c.kind === 'spacing' && best.kind !== 'spacing') return c;
    if (c.guides.length > best.guides.length) return c;
    return best;
  });
}

function buildSnapOthers(
  allRects: RectBounds[],
  excludeIds: Set<string>,
  canvasBounds?: { width: number; height: number },
): RectBounds[] {
  const others = allRects.filter(r => !excludeIds.has(r.id)).map(normalizeBounds);
  if (canvasBounds) {
    others.push({
      id: CANVAS_SNAP_ID,
      x: 0,
      y: 0,
      width: canvasBounds.width,
      height: canvasBounds.height,
    });
  }
  return others;
}

function findClosestHorizontalNeighbors(
  snap: RectBounds,
  others: RectBounds[],
): { left: RectBounds | null; right: RectBounds | null } {
  const m = edges(snap.x, snap.y, snap.width, snap.height);
  let left: RectBounds | null = null;
  let right: RectBounds | null = null;
  let bestLeftRight = -Infinity;
  let bestRightLeft = Infinity;

  for (const other of others) {
    if (other.id === CANVAS_SNAP_ID) continue;
    if (!sameRowForDistance(snap, other)) continue;
    const o = edges(other.x, other.y, other.width, other.height);

    if (o.right <= m.left) {
      if (o.right > bestLeftRight) {
        bestLeftRight = o.right;
        left = other;
      }
    } else if (m.right <= o.left) {
      if (o.left < bestRightLeft) {
        bestRightLeft = o.left;
        right = other;
      }
    }
  }

  return { left, right };
}

function findClosestVerticalNeighbors(
  snap: RectBounds,
  others: RectBounds[],
): { above: RectBounds | null; below: RectBounds | null } {
  const m = edges(snap.x, snap.y, snap.width, snap.height);
  let above: RectBounds | null = null;
  let below: RectBounds | null = null;
  let bestAboveBottom = -Infinity;
  let bestBelowTop = Infinity;

  for (const other of others) {
    if (other.id === CANVAS_SNAP_ID) continue;
    if (!sameColumnForDistance(snap, other)) continue;
    const o = edges(other.x, other.y, other.width, other.height);

    if (o.bottom <= m.top) {
      if (o.bottom > bestAboveBottom) {
        bestAboveBottom = o.bottom;
        above = other;
      }
    } else if (m.bottom <= o.top) {
      if (o.top < bestBelowTop) {
        bestBelowTop = o.top;
        below = other;
      }
    }
  }

  return { above, below };
}

function computeDistanceGuides(
  snapX: number,
  snapY: number,
  snapW: number,
  snapH: number,
  others: RectBounds[],
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  const snap = { x: snapX, y: snapY, width: snapW, height: snapH, id: 'snap' };
  const m = edges(snapX, snapY, snapW, snapH);

  const { left, right } = findClosestHorizontalNeighbors(snap, others);

  if (left) {
    const o = edges(left.x, left.y, left.width, left.height);
    const midY = rangesOverlap(m.top, m.bottom, o.top, o.bottom)
      ? (Math.max(m.top, o.top) + Math.min(m.bottom, o.bottom)) / 2
      : m.centerY;
    const gap = m.left - o.right;
    if (gap >= 0 && gap < MAX_DISTANCE_LABEL) {
      guides.push({
        type: 'distance-h',
        x1: o.right,
        x2: m.left,
        y1: midY,
        y2: midY,
        label: `${Math.round(gap)}`,
        labelX: (o.right + m.left) / 2,
        labelY: midY,
      });
    }
  }

  if (right) {
    const o = edges(right.x, right.y, right.width, right.height);
    const midY = rangesOverlap(m.top, m.bottom, o.top, o.bottom)
      ? (Math.max(m.top, o.top) + Math.min(m.bottom, o.bottom)) / 2
      : m.centerY;
    const gap = o.left - m.right;
    if (gap >= 0 && gap < MAX_DISTANCE_LABEL) {
      guides.push({
        type: 'distance-h',
        x1: m.right,
        x2: o.left,
        y1: midY,
        y2: midY,
        label: `${Math.round(gap)}`,
        labelX: (m.right + o.left) / 2,
        labelY: midY,
      });
    }
  }

  const { above, below } = findClosestVerticalNeighbors(snap, others);

  if (above) {
    const o = edges(above.x, above.y, above.width, above.height);
    const midX = rangesOverlap(m.left, m.right, o.left, o.right)
      ? (Math.max(m.left, o.left) + Math.min(m.right, o.right)) / 2
      : m.centerX;
    const gap = m.top - o.bottom;
    if (gap >= 0 && gap < MAX_DISTANCE_LABEL) {
      guides.push({
        type: 'distance-v',
        y1: o.bottom,
        y2: m.top,
        x1: midX,
        x2: midX,
        label: `${Math.round(gap)}`,
        labelX: midX,
        labelY: (o.bottom + m.top) / 2,
      });
    }
  }

  if (below) {
    const o = edges(below.x, below.y, below.width, below.height);
    const midX = rangesOverlap(m.left, m.right, o.left, o.right)
      ? (Math.max(m.left, o.left) + Math.min(m.right, o.right)) / 2
      : m.centerX;
    const gap = o.top - m.bottom;
    if (gap >= 0 && gap < MAX_DISTANCE_LABEL) {
      guides.push({
        type: 'distance-v',
        y1: m.bottom,
        y2: o.top,
        x1: midX,
        x2: midX,
        label: `${Math.round(gap)}`,
        labelX: midX,
        labelY: (m.bottom + o.top) / 2,
      });
    }
  }

  return guides;
}

function collectCandidatesForAxis(
  snapX: number,
  snapY: number,
  snapW: number,
  snapH: number,
  others: RectBounds[],
  scale: number,
  axis: 'x' | 'y',
): SnapCandidate[] {
  const align = collectAlignmentCandidates(snapX, snapY, snapW, snapH, others, scale);
  const spacing = collectSpacingCandidates(snapX, snapY, snapW, snapH, others, scale);
  return [...align, ...spacing].filter(c => c.axis === axis);
}

export function computeSnap(
  movingRect: RectBounds,
  x: number,
  y: number,
  allRects: RectBounds[],
  excludeIds: Set<string>,
  scale: number,
  options?: SnapOptions,
): SnapResult {
  const snapTarget = options?.snapTarget;
  const snapW = snapTarget?.width ?? movingRect.width;
  const snapH = snapTarget?.height ?? movingRect.height;
  const snapX = snapTarget?.x ?? x;
  const snapY = snapTarget?.y ?? y;

  if (options?.enabled === false) {
    return { x: snapX, y: snapY, guides: [] };
  }

  const others = buildSnapOthers(allRects, excludeIds, options?.canvasBounds);

  const guides: SnapGuide[] = [];

  const xCandidates = collectCandidatesForAxis(snapX, snapY, snapW, snapH, others, scale, 'x');
  const bestX = pickBestCandidate(xCandidates, 'x');
  const snappedX = bestX ? snapX + bestX.delta : snapX;
  if (bestX) guides.push(...bestX.guides);

  const yCandidates = collectCandidatesForAxis(
    snappedX,
    snapY,
    snapW,
    snapH,
    others,
    scale,
    'y',
  );
  const bestY = pickBestCandidate(yCandidates, 'y');
  const snappedY = bestY ? snapY + bestY.delta : snapY;
  if (bestY) guides.push(...bestY.guides);

  guides.push(...computeDistanceGuides(snappedX, snappedY, snapW, snapH, others));

  return { x: Math.round(snappedX), y: Math.round(snappedY), guides };
}

export function computeGroupSnap(
  members: GroupMember[],
  leaderDx: number,
  leaderDy: number,
  allRects: RectBounds[],
  excludeIds: Set<string>,
  scale: number,
  options?: SnapOptions,
): SnapResult {
  const minX = Math.min(...members.map(m => m.startX));
  const minY = Math.min(...members.map(m => m.startY));
  const maxX = Math.max(...members.map(m => m.startX + m.width));
  const maxY = Math.max(...members.map(m => m.startY + m.height));
  const snapX = minX + leaderDx;
  const snapY = minY + leaderDy;
  const snapW = maxX - minX;
  const snapH = maxY - minY;

  if (options?.enabled === false) {
    return { x: snapX, y: snapY, guides: [] };
  }

  const others = buildSnapOthers(allRects, excludeIds, options?.canvasBounds);
  const guides: SnapGuide[] = [];

  const xCandidates: SnapCandidate[] = [];
  for (const member of members) {
    const memberX = member.startX + leaderDx;
    const memberY = member.startY + leaderDy;
    const align = collectAlignmentCandidates(
      memberX,
      memberY,
      member.width,
      member.height,
      others,
      scale,
    );
    xCandidates.push(...align.filter(c => c.axis === 'x'));
  }
  xCandidates.push(
    ...collectSpacingCandidates(snapX, snapY, snapW, snapH, others, scale).filter(
      c => c.axis === 'x',
    ),
  );

  const bestX = pickBestCandidate(xCandidates, 'x');
  const deltaX = bestX ? bestX.delta : 0;
  if (bestX) guides.push(...bestX.guides);

  const yCandidates: SnapCandidate[] = [];
  for (const member of members) {
    const memberX = member.startX + leaderDx + deltaX;
    const memberY = member.startY + leaderDy;
    const align = collectAlignmentCandidates(
      memberX,
      memberY,
      member.width,
      member.height,
      others,
      scale,
    );
    yCandidates.push(...align.filter(c => c.axis === 'y'));
  }
  yCandidates.push(
    ...collectSpacingCandidates(snapX + deltaX, snapY, snapW, snapH, others, scale).filter(
      c => c.axis === 'y',
    ),
  );

  const bestY = pickBestCandidate(yCandidates, 'y');
  const deltaY = bestY ? bestY.delta : 0;
  if (bestY) guides.push(...bestY.guides);

  const snappedX = snapX + deltaX;
  const snappedY = snapY + deltaY;

  guides.push(...computeDistanceGuides(snappedX, snappedY, snapW, snapH, others));

  return { x: Math.round(snappedX), y: Math.round(snappedY), guides };
}

export function computeGroupBounds(
  rects: RectBounds[],
  ids: string[],
): { x: number; y: number; width: number; height: number } | null {
  const selected = rects.filter(r => ids.includes(r.id));
  if (selected.length === 0) return null;

  const minX = Math.min(...selected.map(r => r.x));
  const minY = Math.min(...selected.map(r => r.y));
  const maxX = Math.max(...selected.map(r => r.x + r.width));
  const maxY = Math.max(...selected.map(r => r.y + r.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
