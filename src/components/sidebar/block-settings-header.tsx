import './block-settings-header.scss';

import { useCurrentImage } from '@/hooks/use-current-image';
import { useManageAreas } from '@/hooks/use-manage-areas';
import { BlockDeleteButton } from '@/components/shared/block-delete-button';
import { BlockTypeSelector } from '@/components/shared/block-type-selector';
import { FIELD_TYPE_CONFIG } from '@/types/planner';

interface BlockSettingsHeaderProps {
  rectangleId: string;
}

export const BlockSettingsHeader = ({ rectangleId }: BlockSettingsHeaderProps) => {
  const currentImage = useCurrentImage();
  const { updateAreaType } = useManageAreas();

  const rectangle = currentImage?.rectangles.find(r => r.id === rectangleId);

  if (!rectangle || !currentImage) {
    return null;
  }

  const config = FIELD_TYPE_CONFIG[rectangle.fieldType];
  const order = currentImage.rectangles
    .filter(({ fieldType }) => fieldType === rectangle.fieldType)
    .findIndex(({ id }) => id === rectangle.id);

  return (
    <div className="block-settings-header">
      <div className="block-settings-header__top">
        <p className="block-settings-header__name">
          {config.label} {order + 1}
        </p>
        <BlockDeleteButton rectangleId={rectangleId} />
      </div>
      <BlockTypeSelector
        currentType={rectangle.fieldType}
        onSelect={type => updateAreaType(rectangleId, type)}
        variant="grid"
      />
    </div>
  );
};
