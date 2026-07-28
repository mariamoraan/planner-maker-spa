import Konva from 'konva';
import { useEffect, useRef } from 'react';

export const useKonvaFade = (
  ref: React.RefObject<Konva.Node | null>,
  visible: boolean,
  duration = 0.2,
) => {
  const previousVisible = useRef(visible);

  useEffect(() => {
    const node = ref.current;

    if (!node) return;

    // Instant Initial State
    if (previousVisible.current === visible) {
      node.opacity(visible ? 1 : 0);
      return;
    }

    previousVisible.current = visible;

    const tween = new Konva.Tween({
      node,
      opacity: visible ? 1 : 0,
      duration,
      easing: Konva.Easings.EaseInOut,
    });

    tween.play();

    return () => tween.destroy();
  }, [visible, duration]);
};