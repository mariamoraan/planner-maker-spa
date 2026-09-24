import './pages-map.scss';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus, Info } from 'lucide-react';
import clsx from 'clsx';
import { usePlanLimits } from '@/core/plans';
import { ImageUploader } from '../canvas/ImageUploader';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useManageImages } from '@/features/editor/ui/hooks/use-manage-images';
import { groupImagesByType, TEMPLATE_TYPE_ORDER } from '@/features/template/domain/services/template-image-order';
import { PagesMapGroup } from './pages-map-group';
import { markPendingControlsTour } from '@/features/editor/ui/components/editor-controls-tour/controls-tour-storage';

const SPOTLIGHT_MS = 700;

export const PagesMap = () => {
  const { t } = useTranslation();
  const template = useCurrentTemplate();
  const images = template?.images;
  const { reorderImages } = useManageImages();
  const { limits, canAddPage, pageCountFor } = usePlanLimits();
  const pageCount = pageCountFor(template?.id);
  const atPageLimit = !canAddPage(template?.id);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [spotlightPageId, setSpotlightPageId] = useState<string | null>(null);
  const spotlightTimerRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const groupedImages = useMemo(
    () => groupImagesByType(images ?? []),
    [images]
  );

  const nonEmptyTypes = useMemo(
    () => TEMPLATE_TYPE_ORDER.filter(type => groupedImages[type]?.length),
    [groupedImages]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    reorderImages(String(active.id), String(over.id));
  };

  const handlePageAdded = useCallback((pageId: string) => {
    if (spotlightTimerRef.current != null) {
      window.clearTimeout(spotlightTimerRef.current);
    }
    setSpotlightPageId(pageId);
    spotlightTimerRef.current = window.setTimeout(() => {
      setSpotlightPageId(null);
      spotlightTimerRef.current = null;
    }, SPOTLIGHT_MS);
  }, []);

  const usageCompact = t('limits.pagesUsageCompact', {
    used: pageCount,
    max: limits.maxImagesPerPlanner,
  });

  const freePlanTooltip = t('limits.pagesFreePlanTooltip', {
    max: limits.maxImagesPerPlanner,
  });

  const limitHint = t('limits.pagesLimitReached', {
    max: limits.maxImagesPerPlanner,
  });

  const buttonTitle = uploadError
    ? uploadError
    : atPageLimit
      ? limitHint
      : t('limits.pagesAdd');

  const addPageUploader = (
    <div
      className={clsx('pages-map__add', {
        'pages-map__add--capped': atPageLimit,
        'pages-map__add--error': Boolean(uploadError),
      })}
    >
      <div className="pages-map__add-meta">
        <span
          className={clsx('pages-map__add-label', {
            'pages-map__add-label--capped': atPageLimit,
            'pages-map__add-label--error': Boolean(uploadError),
          })}
        >
          {usageCompact}
        </span>
        <button
          type="button"
          className="pages-map__add-info"
          aria-label={t('limits.pagesLimitInfo')}
          aria-describedby="pages-map-free-plan-tooltip"
        >
          <Info size={11} strokeWidth={2.25} aria-hidden />
        </button>
        <span
          id="pages-map-free-plan-tooltip"
          role="tooltip"
          className="pages-map__add-tooltip"
        >
          {freePlanTooltip}
        </span>
      </div>
      <ImageUploader
        onUploadComplete={!images?.length ? markPendingControlsTour : undefined}
        onPageAdded={handlePageAdded}
        showLimitHints={false}
        onError={setUploadError}
        customButton={
          <button
            type="button"
            className="pages-map__add-page-button"
            disabled={atPageLimit}
            aria-label={
              atPageLimit ? t('limits.pagesAddDisabled') : t('limits.pagesAdd')
            }
            title={buttonTitle}
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden />
          </button>
        }
      />
      <span className="sr-only" aria-live="polite">
        {uploadError ?? (atPageLimit ? limitHint : null)}
      </span>
    </div>
  );

  if (!images?.length) {
    return (
      <div className="pages-map" data-tour-anchor="pages-map">
        {addPageUploader}
      </div>
    );
  }

  return (
    <div className="pages-map" data-tour-anchor="pages-map">
      {addPageUploader}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="pages-map__groups">
          {nonEmptyTypes.map((type, index) => (
            <PagesMapGroup
              key={type}
              type={type}
              images={groupedImages[type]!}
              showSeparator={index > 0}
              spotlightPageId={spotlightPageId}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};
