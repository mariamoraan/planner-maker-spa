import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { TEMPLATE_TYPE_CONFIG, TemplateImage, TemplateType } from '@/features/template';
import { SortablePageThumbnail } from './sortable-page-thumbnail';

interface Props {
  type: TemplateType;
  images: TemplateImage[];
  showSeparator: boolean;
}

export const PagesMapGroup = ({ type, images, showSeparator }: Props) => {
  return (
    <>
      {showSeparator && <div className="pages-map__group-separator" aria-hidden="true" />}
      <div className="pages-map__group">
        <p className="pages-map__group-label">{TEMPLATE_TYPE_CONFIG[type].label}</p>
        <SortableContext
          items={images.map(image => image.id)}
          strategy={horizontalListSortingStrategy}
        >
          <ul className="pages-map__group-list">
            {images.map(image => (
              <SortablePageThumbnail key={image.id} image={image} />
            ))}
          </ul>
        </SortableContext>
      </div>
    </>
  );
};
