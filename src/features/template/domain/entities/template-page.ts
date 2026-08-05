import type { ImageRef } from '../value-objects/image-ref';
import type { TemplateType } from '../value-objects/planner-locale';
import type { Rectangle } from './rectangle';

export interface GridGroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridGroupSettings {
  cols: number;
  rows: number;
  align: 'top-left' | 'center';
  rectWidth: number;
  rectHeight: number;
  padding?: { x: number; y: number };
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
