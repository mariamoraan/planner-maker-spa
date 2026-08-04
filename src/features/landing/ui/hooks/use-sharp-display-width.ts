import { useEffect, useState } from 'react';

/** Max CSS width so a raster image is not upscaled on the current display. */
export function useSharpDisplayWidth(nativeWidth: number) {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined'
      ? nativeWidth
      : Math.min(nativeWidth, Math.floor(nativeWidth / (window.devicePixelRatio || 1))),
  );

  useEffect(() => {
    const update = () => {
      const dpr = window.devicePixelRatio || 1;
      setWidth(Math.min(nativeWidth, Math.floor(nativeWidth / dpr)));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [nativeWidth]);

  return width;
}
