import './canvas-zoom-controls.scss';

import { useTranslation } from 'react-i18next';

interface CanvasZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  measureHint?: string;
  variant?: 'default' | 'floating';
}

export const CanvasZoomControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  measureHint,
  variant = 'default',
}: CanvasZoomControlsProps) => {
  const { t } = useTranslation();
  const isFloating = variant === 'floating';

  return (
    <div className={`canvas-zoom-controls${isFloating ? ' canvas-zoom-controls--floating' : ''}`}>
      <div className="canvas-zoom-controls__buttons">
        <button
          type="button"
          className="canvas-zoom-controls__button"
          onClick={onZoomIn}
          title={t('editor.zoomIn')}
          aria-label={t('editor.zoomIn')}
        >
          +
        </button>
        <button
          type="button"
          className="canvas-zoom-controls__reset"
          onClick={onZoomReset}
          title={t('editor.zoomReset')}
          aria-label={t('editor.zoomReset')}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="canvas-zoom-controls__button"
          onClick={onZoomOut}
          title={t('editor.zoomOut')}
          aria-label={t('editor.zoomOut')}
        >
          −
        </button>
      </div>
      {!isFloating && measureHint && <p className="canvas-zoom-controls__hint">{measureHint}</p>}
    </div>
  );
};
