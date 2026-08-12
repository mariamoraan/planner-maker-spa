import type { ImageRef } from '../value-objects/image-ref';
import type { TemplateType } from '../value-objects/planner-locale';
import type { Rectangle } from './rectangle';

export interface GridGroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GridAlignH = 'left' | 'center' | 'right';
export type GridAlignV = 'top' | 'center' | 'bottom';

export interface GridGroupSettings {
  cols: number;
  rows: number;
  rectWidth: number;
  rectHeight: number;
  alignH: GridAlignH;
  alignV: GridAlignV;
  padding?: { x: number; y: number };
  gap?: { x: number; y: number };
  /** @deprecated Legacy — use alignH/alignV. Kept for loading old templates. */
  align?: 'top-left' | 'center';
}

export interface GridGroup {
  id: string;
  rectIds: string[];
  cols: number;
  rows: number;
  bounds: GridGroupBounds;
  settings: GridGroupSettings;
}

export interface TemplatePage {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  rectangles: Rectangle[];
  gridGroups?: Record<string, GridGroup>;
  createdAt: Date;
  updatedAt: Date;
  src: string;
  imageRef?: ImageRef;
  missingLocalAsset?: boolean;
}

/** @deprecated Use TemplatePage — kept for backward compatibility during migration */
export type TemplateImage = TemplatePage;
