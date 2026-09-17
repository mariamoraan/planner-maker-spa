import React from 'react';
import type { RefObject } from 'react';
import { Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { SnapGuide } from '@/features/editor/domain/services/canvas-snap';
import {
  EDITOR_CHROME_INK,
} from '@/features/editor/domain/constants/editor-chrome';
import { SnapGuidesOverlay } from './snap-guides-overlay';
import type { MarqueeRect } from './canvas-interaction-types';

interface CanvasSelectionOverlaysProps {
  scale: number;
  offset: { x: number; y: number };
  isSelectMode: boolean;
  marquee: MarqueeRect | null;
  groupSelectionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  isGridGroupFullySelected: boolean;
  snapGuides: SnapGuide[];
  transformerRef: RefObject<Konva.Transformer | null>;
}

export const CanvasSelectionOverlays: React.FC<CanvasSelectionOverlaysProps> = ({
  scale,
  offset,
  isSelectMode,
  marquee,
  groupSelectionBounds,
  isGridGroupFullySelected,
  snapGuides,
  transformerRef,
}) => (
  <>
    {marquee && (
      <Rect
        x={offset.x + marquee.x * scale}
        y={offset.y + marquee.y * scale}
        width={marquee.width * scale}
        height={marquee.height * scale}
        fill="rgba(0, 200, 255, 0.1)"
        stroke="rgba(0, 200, 255, 0.6)"
        strokeWidth={1}
        dash={[4, 4]}
      />
    )}

    {groupSelectionBounds && isSelectMode && !isGridGroupFullySelected && (
      <Rect
        x={offset.x + groupSelectionBounds.x * scale}
        y={offset.y + groupSelectionBounds.y * scale}
        width={groupSelectionBounds.width * scale}
        height={groupSelectionBounds.height * scale}
        stroke={EDITOR_CHROME_INK}
        strokeWidth={1.5}
        dash={[6, 4]}
        cornerRadius={0}
        listening={false}
      />
    )}

    <SnapGuidesOverlay guides={snapGuides} scale={scale} offset={offset} />

    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) =>
        newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
      }
      rotateEnabled={false}
      anchorSize={8}
      borderStroke={EDITOR_CHROME_INK}
      anchorFill={EDITOR_CHROME_INK}
      anchorStroke="white"
    />
  </>
);
