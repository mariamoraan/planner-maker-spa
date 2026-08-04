import type { ImageRef } from '../value-objects/image-ref';
import type { TemplateType } from '../value-objects/planner-locale';
import type { Rectangle } from './rectangle';

export interface TemplatePage {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  rectangles: Rectangle[];
  createdAt: Date;
  updatedAt: Date;
  src: string;
  imageRef?: ImageRef;
  missingLocalAsset?: boolean;
}

/** @deprecated Use TemplatePage — kept for backward compatibility during migration */
export type TemplateImage = TemplatePage;
