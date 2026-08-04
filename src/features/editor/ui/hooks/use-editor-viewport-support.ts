import { useEffect, useState } from 'react';

export const EDITOR_MIN_WIDTH = 900;
export const EDITOR_MIN_HEIGHT = 560;

const MEDIA_QUERY = `(min-width: ${EDITOR_MIN_WIDTH}px) and (min-height: ${EDITOR_MIN_HEIGHT}px)`;

function checkViewportSupport(): boolean {
  return window.innerWidth >= EDITOR_MIN_WIDTH && window.innerHeight >= EDITOR_MIN_HEIGHT;
}

export function useEditorViewportSupport() {
  const [isSupported, setIsSupported] = useState(() =>
    typeof window !== 'undefined' ? checkViewportSupport() : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(MEDIA_QUERY);

    const onChange = () => {
      setIsSupported(checkViewportSupport());
    };

    mql.addEventListener('change', onChange);
    setIsSupported(checkViewportSupport());

    return () => mql.removeEventListener('change', onChange);
  }, []);

  return { isSupported };
}
