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
  /** Degrees, clockwise. Rotates the whole grid around its bounds center. */
  rotation?: number;
  /** Shared date source for cells in this grid (and any free members of the same group). */
  bindingGroupId?: string;
}

/** How a binding group resolves dates from the page context. */
export type BindingSourceKind = 'page' | 'monthDays' | 'weekDays' | 'yearMonths';

/**
 * First-class date binding shared by one or more blocks.
 * Independent of layout grids — a grid may reference a binding group,
 * and free (non-grid) blocks can share one too.
 */
export interface BindingGroup {
  id: string;
  name?: string;
  source: BindingSourceKind;
  /**
   * On yearly-calendar pages, which month (0–11) a `monthDays` group
   * anchors to when rendering a mini day calendar.
   */
  yearMonthIndex?: number;
}

export type SpreadFace = 'left' | 'right';

export interface TemplatePage {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  rectangles: Rectangle[];
  gridGroups?: Record<string, GridGroup>;
  bindingGroups?: Record<string, BindingGroup>;
  createdAt: Date;
  updatedAt: Date;
  src: string;
  /**
   * Alternate display URL if `src` fails (e.g. signed CDN when the
   * same-origin content proxy cannot reach UploadThing).
   */
  srcAlt?: string;
  imageRef?: ImageRef;
  missingLocalAsset?: boolean;
  /** Shared id for a contiguous two-page spread (left + right faces). */
  spreadId?: string;
  /** Which face of the spread this page is. Undefined for single pages. */
  spreadFace?: SpreadFace;
}

/** @deprecated Use TemplatePage — kept for backward compatibility during migration */
export type TemplateImage = TemplatePage;
