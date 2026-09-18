import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TemplateImage } from '@/features/template';
import { PageThumbnail } from './page-thumbnail';

/** Matches `--pages-map-thumbnail-height` in pages-map.scss */
const PAGES_MAP_THUMBNAIL_HEIGHT = 72;

interface Props {
  image: TemplateImage;
}

export const SortablePageThumbnail = ({ image }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const aspectRatio = image.height > 0 ? image.width / image.height : 3 / 4;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: PAGES_MAP_THUMBNAIL_HEIGHT * aspectRatio,
    aspectRatio: `${image.width} / ${image.height}`,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx('pages-map__li', {
        'pages-map__li--dragging': isDragging,
      })}
      {...attributes}
      {...listeners}
    >
      <PageThumbnail image={image} />
    </li>
  );
};
