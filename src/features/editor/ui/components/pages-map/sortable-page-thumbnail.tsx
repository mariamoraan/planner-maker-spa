import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageUnit } from '@/features/template';
import { getUnitId, getUnitPrimaryPage } from '@/features/template';
import { PageThumbnail } from './page-thumbnail';

/** Matches `--pages-map-thumbnail-height` in pages-map.scss */
const PAGES_MAP_THUMBNAIL_HEIGHT = 72;

interface Props {
  unit: PageUnit;
}

export const SortablePageThumbnail = ({ unit }: Props) => {
  const unitId = getUnitId(unit);
  const primary = getUnitPrimaryPage(unit);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unitId });

  const aspectRatio = primary.height > 0 ? primary.width / primary.height : 3 / 4;
  const width =
    unit.kind === 'spread'
      ? PAGES_MAP_THUMBNAIL_HEIGHT * aspectRatio * 2 + 2
      : PAGES_MAP_THUMBNAIL_HEIGHT * aspectRatio;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx('pages-map__li', {
        'pages-map__li--dragging': isDragging,
        'pages-map__li--spread': unit.kind === 'spread',
      })}
      {...attributes}
      {...listeners}
    >
      {unit.kind === 'spread' ? (
        <div className="pages-map__spread-thumbs">
          <PageThumbnail image={unit.left} />
          <PageThumbnail image={unit.right} />
        </div>
      ) : (
        <PageThumbnail image={unit.page} />
      )}
    </li>
  );
};
