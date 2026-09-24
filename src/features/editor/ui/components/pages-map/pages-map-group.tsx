import { useMemo } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import {
  TEMPLATE_TYPE_CONFIG,
  TemplateImage,
  TemplateType,
  getUnitId,
  groupImagesAsUnits,
} from '@/features/template';
import { SortablePageThumbnail } from './sortable-page-thumbnail';

interface Props {
  type: TemplateType;
  images: TemplateImage[];
  showSeparator: boolean;
}

export const PagesMapGroup = ({ type, images, showSeparator }: Props) => {
  const units = useMemo(() => groupImagesAsUnits(images), [images]);
  const unitIds = useMemo(() => units.map(getUnitId), [units]);

  return (
    <>
      {showSeparator && <div className="pages-map__group-separator" aria-hidden="true" />}
      <div className="pages-map__group">
        <p className="pages-map__group-label">{TEMPLATE_TYPE_CONFIG[type].label}</p>
        <SortableContext items={unitIds} strategy={horizontalListSortingStrategy}>
          <ul className="pages-map__group-list">
            {units.map(unit => (
              <SortablePageThumbnail key={getUnitId(unit)} unit={unit} />
            ))}
          </ul>
        </SortableContext>
      </div>
    </>
  );
};
