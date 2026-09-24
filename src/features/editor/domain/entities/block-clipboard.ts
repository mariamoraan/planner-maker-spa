import type { BindingGroup, GridGroup, Rectangle } from '@/features/template';

export type BlockClipboard = {
  sourceImageId: string;
  rectangles: Rectangle[];
  gridGroups?: Record<string, GridGroup>;
  bindingGroups?: Record<string, BindingGroup>;
};

export type ActiveBlockDrag = {
  sourceImageId: string;
  movingIds: string[];
  startPositions: { id: string; x: number; y: number; width: number; height: number }[];
};

export type CrossFaceDrop = {
  targetImageId: string;
  /** Positions in destination page image space, keyed by source rect id. */
  positions: Record<string, { x: number; y: number }>;
};
