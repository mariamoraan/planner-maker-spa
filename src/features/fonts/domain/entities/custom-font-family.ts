import type { FontAssetRef } from '../value-objects/font-asset-ref';

export type FontFaceStyle = 'normal' | 'italic';
export type FontFaceWeight = 400 | 700;

export interface FontFaceAsset {
  weight: FontFaceWeight;
  style: FontFaceStyle;
  fileName: string;
  assetRef: FontAssetRef;
}

export interface CustomFontFamily {
  id: string;
  name: string;
  faces: FontFaceAsset[];
  createdAt: number;
  updatedAt: number;
}

export const FONT_FACE_ROLES = [
  { weight: 400, style: 'normal', label: 'Regular' },
  { weight: 400, style: 'italic', label: 'Italic' },
  { weight: 700, style: 'normal', label: 'Bold' },
  { weight: 700, style: 'italic', label: 'Bold Italic' },
] as const satisfies readonly {
  weight: FontFaceWeight;
  style: FontFaceStyle;
  label: string;
}[];

export type FontFaceRoleLabel = (typeof FONT_FACE_ROLES)[number]['label'];

export function findFace(
  family: CustomFontFamily,
  weight: FontFaceWeight,
  style: FontFaceStyle,
): FontFaceAsset | undefined {
  return family.faces.find(face => face.weight === weight && face.style === style);
}

export function hasRegularFace(family: CustomFontFamily): boolean {
  return Boolean(findFace(family, 400, 'normal'));
}

export function cssFamilyNameForCustomFont(fontId: string): string {
  return `PlannerCustom-${fontId}`;
}
