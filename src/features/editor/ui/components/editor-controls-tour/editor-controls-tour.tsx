import './editor-controls-tour.scss';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/core/components/ui/button';
import {
  markControlsTourSeen,
  shouldShowControlsTour,
} from './controls-tour-storage';

type TourAnchorId = 'add-blocks' | 'toolbar' | 'pages-map' | 'generate';

const TOUR_STEPS: { anchor: TourAnchorId; titleKey: string; bodyKey: string }[] = [
  {
    anchor: 'add-blocks',
    titleKey: 'editor.tour.addBlocksTitle',
    bodyKey: 'editor.tour.addBlocksBody',
  },
  {
    anchor: 'toolbar',
    titleKey: 'editor.tour.toolbarTitle',
    bodyKey: 'editor.tour.toolbarBody',
  },
  {
    anchor: 'pages-map',
    titleKey: 'editor.tour.pagesTitle',
    bodyKey: 'editor.tour.pagesBody',
  },
  {
    anchor: 'generate',
    titleKey: 'editor.tour.generateTitle',
    bodyKey: 'editor.tour.generateBody',
  },
];

interface CardPosition {
  top: number;
  left: number;
  placement: 'below' | 'above' | 'right' | 'left';
}

const CARD_WIDTH = 300;
const CARD_GAP = 12;

const getCardPosition = (anchor: TourAnchorId, rect: DOMRect): CardPosition => {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  if (anchor === 'add-blocks' || anchor === 'generate') {
    const left = Math.min(rect.right + CARD_GAP, viewportW - CARD_WIDTH - 16);
    const top = Math.max(16, Math.min(rect.top, viewportH - 200));
    return { top, left: Math.max(16, left), placement: 'right' };
  }

  if (anchor === 'pages-map') {
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - CARD_WIDTH / 2, viewportW - CARD_WIDTH - 16));
    const top = Math.max(16, rect.top - 160);
    return { top, left, placement: 'above' };
  }

  // toolbar
  const left = Math.max(16, Math.min(rect.left + rect.width / 2 - CARD_WIDTH / 2, viewportW - CARD_WIDTH - 16));
  const top = Math.min(rect.bottom + CARD_GAP, viewportH - 200);
  return { top, left, placement: 'below' };
};

export const EditorControlsTour = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [cardPosition, setCardPosition] = useState<CardPosition | null>(null);

  useEffect(() => {
    if (shouldShowControlsTour()) {
      setActive(true);
    }
  }, []);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const updatePositions = useCallback(() => {
    if (!active || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour-anchor="${step.anchor}"]`);
    if (!el) {
      setHighlightRect(null);
      setCardPosition({
        top: window.innerHeight / 2 - 80,
        left: Math.max(16, window.innerWidth / 2 - CARD_WIDTH / 2),
        placement: 'below',
      });
      return;
    }
    const rect = el.getBoundingClientRect();
    setHighlightRect(rect);
    setCardPosition(getCardPosition(step.anchor, rect));
  }, [active, step]);

  useLayoutEffect(() => {
    updatePositions();
  }, [updatePositions]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => updatePositions();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, updatePositions]);

  const finish = () => {
    markControlsTourSeen();
    setActive(false);
  };

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex(i => i + 1);
  };

  if (!active || !step || !cardPosition) return null;

  return (
    <div className="editor-controls-tour" role="dialog" aria-modal="true" aria-labelledby="editor-controls-tour-title">
      <div className="editor-controls-tour__blocker" aria-hidden="true" />
      {highlightRect ? (
        <div
          className="editor-controls-tour__highlight"
          style={{
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
          }}
        />
      ) : (
        <div className="editor-controls-tour__backdrop" />
      )}
      <div
        className={`editor-controls-tour__card editor-controls-tour__card--${cardPosition.placement}`}
        style={{ top: cardPosition.top, left: cardPosition.left, width: CARD_WIDTH }}
      >
        <p className="editor-controls-tour__progress">
          {t('editor.tour.stepIndicator', {
            current: stepIndex + 1,
            total: TOUR_STEPS.length,
          })}
        </p>
        <h3 id="editor-controls-tour-title" className="editor-controls-tour__title">
          {t(step.titleKey)}
        </h3>
        <p className="editor-controls-tour__body">{t(step.bodyKey)}</p>
        <div className="editor-controls-tour__actions">
          <button type="button" className="editor-controls-tour__skip" onClick={finish}>
            {t('common.skip')}
          </button>
          <Button size="sm" variant="accent" onClick={goNext}>
            {isLast ? t('common.gotIt') : t('common.next')}
          </Button>
        </div>
      </div>
    </div>
  );
};
