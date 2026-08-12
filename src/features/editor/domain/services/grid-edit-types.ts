import type { GridBounds } from './grid-layout';

export type GridAlignH = 'left' | 'center' | 'right';
export type GridAlignV = 'top' | 'center' | 'bottom';

export interface GridEditSettings {
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

export interface GridGroupEditInput {
  rectIds: string[];
  bounds: GridBounds;
  settings: GridEditSettings;
}

type GridSettingsLike = {
  cols: number;
  rows: number;
  rectWidth: number;
  rectHeight: number;
  alignH?: GridAlignH;
  alignV?: GridAlignV;
  padding?: { x: number; y: number };
  gap?: { x: number; y: number };
  align?: 'top-left' | 'center';
};

export function normalizeGridSettings(settings: GridSettingsLike): GridEditSettings {
  if (settings.alignH && settings.alignV) {
    return {
      cols: settings.cols,
      rows: settings.rows,
      rectWidth: settings.rectWidth,
      rectHeight: settings.rectHeight,
      alignH: settings.alignH,
      alignV: settings.alignV,
      padding: settings.padding,
      ...(settings.gap !== undefined ? { gap: settings.gap } : {}),
    };
  }

  if (settings.align === 'center') {
    return {
      cols: settings.cols,
      rows: settings.rows,
      rectWidth: settings.rectWidth,
      rectHeight: settings.rectHeight,
      alignH: 'center',
      alignV: 'center',
      padding: { x: 0, y: 0 },
      ...(settings.gap !== undefined ? { gap: settings.gap } : {}),
    };
  }

  return {
    cols: settings.cols,
    rows: settings.rows,
    rectWidth: settings.rectWidth,
    rectHeight: settings.rectHeight,
    alignH: 'left',
    alignV: 'top',
    padding: settings.padding ?? { x: 0, y: 0 },
    ...(settings.gap !== undefined ? { gap: settings.gap } : {}),
  };
}

export function toPersistedGridSettings(settings: GridEditSettings): GridEditSettings {
  const normalized = normalizeGridSettings(settings);
  const { align: _legacy, ...rest } = normalized as GridEditSettings & { align?: string };
  return rest;
}
