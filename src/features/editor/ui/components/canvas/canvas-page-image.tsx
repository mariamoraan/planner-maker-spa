import React from 'react';
import { Image as KonvaImage } from 'react-konva';

interface CanvasPageImageProps {
  image: CanvasImageSource;
  width: number;
  height: number;
  scale: number;
  offset: { x: number; y: number };
}

export const CanvasPageImage: React.FC<CanvasPageImageProps> = ({
  image,
  width,
  height,
  scale,
  offset,
}) => (
  <KonvaImage
    image={image}
    width={width}
    height={height}
    scaleX={scale}
    scaleY={scale}
    x={offset.x}
    y={offset.y}
    shadowColor="rgba(0, 0, 0, 0.1)"
    shadowOffsetX={0}
    shadowOffsetY={4}
    shadowBlur={12}
    name="background"
  />
);
