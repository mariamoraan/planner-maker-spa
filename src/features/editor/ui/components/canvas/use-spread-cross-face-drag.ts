import { useEffect, useState, type MutableRefObject } from 'react';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

export type SpreadFaceRefs = {
  left: HTMLElement | null;
  right: HTMLElement | null;
};

export type CrossFaceGhost = {
  targetFace: 'left' | 'right';
  /** Client coords of the selection AABB top-left. */
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * While a block drag is active, detect pointer over the mate spread face and
 * stage a cross-face drop for handleDragEnd to consume.
 */
export function useSpreadCrossFaceDrag(args: {
  leftPageId: string;
  rightPageId: string;
  leftWidth: number;
  leftHeight: number;
  rightWidth: number;
  rightHeight: number;
  faceRefs: MutableRefObject<SpreadFaceRefs>;
}) {
  const activeBlockDrag = useEditorStore(state => state.activeBlockDrag);
  const setPendingCrossFaceDrop = useEditorStore(state => state.setPendingCrossFaceDrop);
  const [ghost, setGhost] = useState<CrossFaceGhost | null>(null);

  useEffect(() => {
    if (!activeBlockDrag) {
      setGhost(null);
      return;
    }

    const leftSize = { width: args.leftWidth, height: args.leftHeight };
    const rightSize = { width: args.rightWidth, height: args.rightHeight };

    const resolveTarget = (clientX: number, clientY: number) => {
      const { left, right } = args.faceRefs.current;
      if (!left || !right) return null;

      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();

      const overLeft =
        clientX >= leftRect.left &&
        clientX <= leftRect.right &&
        clientY >= leftRect.top &&
        clientY <= leftRect.bottom;
      const overRight =
        clientX >= rightRect.left &&
        clientX <= rightRect.right &&
        clientY >= rightRect.top &&
        clientY <= rightRect.bottom;

      if (activeBlockDrag.sourceImageId === args.leftPageId && overRight) {
        return {
          face: 'right' as const,
          bounds: rightRect,
          pageId: args.rightPageId,
          size: rightSize,
        };
      }
      if (activeBlockDrag.sourceImageId === args.rightPageId && overLeft) {
        return {
          face: 'left' as const,
          bounds: leftRect,
          pageId: args.leftPageId,
          size: leftSize,
        };
      }
      return null;
    };

    const mapToImageSpace = (
      clientX: number,
      clientY: number,
      bounds: DOMRect,
      pageSize: { width: number; height: number },
    ) => {
      const relX = (clientX - bounds.left) / Math.max(1, bounds.width);
      const relY = (clientY - bounds.top) / Math.max(1, bounds.height);
      return {
        x: relX * pageSize.width,
        y: relY * pageSize.height,
      };
    };

    const onPointerMove = (e: PointerEvent | MouseEvent) => {
      const target = resolveTarget(e.clientX, e.clientY);
      if (!target) {
        setGhost(null);
        return;
      }

      const starts = activeBlockDrag.startPositions;
      const minX = Math.min(...starts.map(s => s.x));
      const minY = Math.min(...starts.map(s => s.y));
      const maxX = Math.max(...starts.map(s => s.x + s.width));
      const maxY = Math.max(...starts.map(s => s.y + s.height));
      const boxW = maxX - minX;
      const boxH = maxY - minY;

      const pointerImage = mapToImageSpace(
        e.clientX,
        e.clientY,
        target.bounds,
        target.size,
      );

      const ghostImageX = pointerImage.x - boxW / 2;
      const ghostImageY = pointerImage.y - boxH / 2;

      setGhost({
        targetFace: target.face,
        left:
          target.bounds.left +
          (ghostImageX / target.size.width) * target.bounds.width,
        top:
          target.bounds.top +
          (ghostImageY / target.size.height) * target.bounds.height,
        width: (boxW / target.size.width) * target.bounds.width,
        height: (boxH / target.size.height) * target.bounds.height,
      });
    };

    const onPointerUp = (e: PointerEvent | MouseEvent) => {
      const target = resolveTarget(e.clientX, e.clientY);
      if (!target) {
        setPendingCrossFaceDrop(null);
        setGhost(null);
        return;
      }

      const starts = activeBlockDrag.startPositions;
      const minX = Math.min(...starts.map(s => s.x));
      const minY = Math.min(...starts.map(s => s.y));
      const maxX = Math.max(...starts.map(s => s.x + s.width));
      const maxY = Math.max(...starts.map(s => s.y + s.height));
      const boxW = maxX - minX;
      const boxH = maxY - minY;

      const pointerImage = mapToImageSpace(
        e.clientX,
        e.clientY,
        target.bounds,
        target.size,
      );
      const originX = pointerImage.x - boxW / 2;
      const originY = pointerImage.y - boxH / 2;

      const positions: Record<string, { x: number; y: number }> = {};
      for (const start of starts) {
        positions[start.id] = {
          x: originX + (start.x - minX),
          y: originY + (start.y - minY),
        };
      }

      setPendingCrossFaceDrop({
        targetImageId: target.pageId,
        positions,
      });
      setGhost(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('mouseup', onPointerUp, true);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('mouseup', onPointerUp, true);
    };
  }, [
    activeBlockDrag,
    args.faceRefs,
    args.leftPageId,
    args.rightPageId,
    args.leftWidth,
    args.leftHeight,
    args.rightWidth,
    args.rightHeight,
    setPendingCrossFaceDrop,
  ]);

  return { ghost, isCrossFaceDragging: Boolean(activeBlockDrag && ghost) };
}
