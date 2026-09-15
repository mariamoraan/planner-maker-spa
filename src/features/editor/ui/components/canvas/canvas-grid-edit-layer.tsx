import React from 'react';
import { Layer } from 'react-konva';
import type { GridBounds } from '@/features/editor/domain/services/grid-layout';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';
import type { GridEditFocus } from '@/features/editor/ui/stores/editor-store';
import { GridOverlay } from './grid-overlay';
import { GridBoundsHandles } from './grid-bounds-handles';
import { GridBlockHandles } from './grid-block-handles';
import { GridGapHandles } from './grid-gap-handles';
import { GridFocusZones } from './grid-focus-zones';

interface CanvasGridEditLayerProps {
  lockedGridGroup: { id: string } | null;
  activeGridBounds: GridBounds | null;
  activeGridSettings: GridEditSettings | null;
  gridEditFocus: GridEditFocus;
  setGridEditFocus: (focus: GridEditFocus) => void;
  gridMinBounds: { width: number; height: number } | null;
  scale: number;
  offset: { x: number; y: number };
  onBoundsChange: (bounds: GridBounds) => void;
  onBoundsCommit: () => void;
  onSettingsPreview: (updates: Partial<GridEditSettings> & { gapX?: number; gapY?: number }) => void;
  onSettingsCommit: () => void;
}

export const CanvasGridEditLayer: React.FC<CanvasGridEditLayerProps> = ({
  lockedGridGroup,
  activeGridBounds,
  activeGridSettings,
  gridEditFocus,
  setGridEditFocus,
  gridMinBounds,
  scale,
  offset,
  onBoundsChange,
  onBoundsCommit,
  onSettingsPreview,
  onSettingsCommit,
}) => {
  if (!lockedGridGroup || !activeGridBounds || !activeGridSettings) {
    return null;
  }

  return (
    <Layer>
      <GridOverlay
        bounds={activeGridBounds}
        settings={activeGridSettings}
        scale={scale}
        offset={offset}
        mode={gridEditFocus === 'grid' ? 'edit' : 'preview'}
      />
      <GridFocusZones
        bounds={activeGridBounds}
        settings={activeGridSettings}
        scale={scale}
        offset={offset}
        focus={gridEditFocus}
        onFocusChange={setGridEditFocus}
      />
      {gridEditFocus === 'grid' && (
        <>
          <GridBoundsHandles
            bounds={activeGridBounds}
            scale={scale}
            offset={offset}
            minBounds={gridMinBounds ?? undefined}
            onBoundsChange={onBoundsChange}
            onDragEnd={onBoundsCommit}
          />
          <GridGapHandles
            bounds={activeGridBounds}
            settings={activeGridSettings}
            scale={scale}
            offset={offset}
            onGapPreview={onSettingsPreview}
            onDragEnd={onSettingsCommit}
          />
        </>
      )}
      {gridEditFocus === 'block' && (
        <GridBlockHandles
          bounds={activeGridBounds}
          settings={activeGridSettings}
          scale={scale}
          offset={offset}
          onSettingsChange={onSettingsPreview}
          onDragEnd={onSettingsCommit}
        />
      )}
    </Layer>
  );
};
