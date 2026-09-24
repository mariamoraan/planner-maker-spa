import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import {
  TemplateImage,
  TemplateType,
  getUnitId,
  groupImagesAsUnits,
  pageTypeLabelKey,
} from '@/features/template';
import { SortablePageThumbnail } from './sortable-page-thumbnail';

interface Props {
  type: TemplateType;
  images: TemplateImage[];
  showSeparator: boolean;
  spotlightPageId?: string | null;
}

export const PagesMapGroup = ({
  type,
  images,
  showSeparator,
  spotlightPageId = null,
}: Props) => {
  const { t } = useTranslation();
  const units = useMemo(() => groupImagesAsUnits(images), [images]);
  const unitIds = useMemo(() => units.map(getUnitId), [units]);

  return (
    <>
      {showSeparator && <div className="pages-map__group-separator" aria-hidden="true" />}
      <div className="pages-map__group">
        <p className="pages-map__group-label">{t(pageTypeLabelKey(type))}</p>
        <SortableContext items={unitIds} strategy={horizontalListSortingStrategy}>
          <ul className="pages-map__group-list">
            {units.map(unit => (
              <SortablePageThumbnail
                key={getUnitId(unit)}
                unit={unit}
                spotlightPageId={spotlightPageId}
              />
            ))}
          </ul>
        </SortableContext>
      </div>
    </>
  );
};
