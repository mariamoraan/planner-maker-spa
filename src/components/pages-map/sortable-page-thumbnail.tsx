import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TemplateImage } from '@/types/planner';
import { PageThumbnail } from './page-thumbnail';

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
