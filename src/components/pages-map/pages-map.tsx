import './pages-map.scss';
import { useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { ImageUploader } from '../canvas/ImageUploader';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { useManageImages } from '@/hooks/use-manage-images';
import { groupImagesByType, TEMPLATE_TYPE_ORDER } from '@/lib/template-image-order';
import { PagesMapGroup } from './pages-map-group';

export const PagesMap = () => {
  const template = useCurrentTemplate();
  const images = template?.images;
  const { reorderImages } = useManageImages();

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

  if (!images?.length) return null;

  return (
    <div className="pages-map">
      <div className="pages-map__add">
        <span className="pages-map__add-spacer" aria-hidden="true" />
        <ImageUploader
          customButton={
            <button type="button" className="pages-map__add-page-button">
              <Plus />
            </button>
          }
        />
      </div>
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
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};
