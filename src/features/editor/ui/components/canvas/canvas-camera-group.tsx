import React from 'react';
import { Group } from 'react-konva';

export interface CanvasCamera {
  scale: number;
  offset: { x: number; y: number };
}

interface CanvasCameraGroupProps extends CanvasCamera {
  children: React.ReactNode;
  listening?: boolean;
}

/** Applies viewport pan/zoom once so children can use image-space coordinates. */
export const CanvasCameraGroup: React.FC<CanvasCameraGroupProps> = ({
  scale,
  offset,
  children,
  listening,
}) => (
  <Group x={offset.x} y={offset.y} scaleX={scale} scaleY={scale} listening={listening}>
    {children}
  </Group>
);

/** Convert stage pointer position into image-space coordinates. */
export function pointerToImageSpace(
  pointer: { x: number; y: number },
  camera: CanvasCamera,
): { x: number; y: number } {
  return {
    x: (pointer.x - camera.offset.x) / camera.scale,
    y: (pointer.y - camera.offset.y) / camera.scale,
  };
}

/** Keep a screen-pixel size constant under camera zoom. */
export function screenPx(value: number, scale: number): number {
  return value / scale;
}
