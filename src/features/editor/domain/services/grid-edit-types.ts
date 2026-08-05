import type { GridBounds } from './grid-layout';

export interface GridEditSettings {
  cols: number;
  rows: number;
  align: 'top-left' | 'center';
  rectWidth: number;
  rectHeight: number;
  padding?: { x: number; y: number };
}

export interface GridGroupEditInput {
  rectIds: string[];
  bounds: GridBounds;
  settings: GridEditSettings;
}
