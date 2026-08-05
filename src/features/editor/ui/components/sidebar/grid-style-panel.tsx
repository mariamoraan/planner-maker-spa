import { useTranslation } from 'react-i18next';
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useGridStyleEditing } from '@/features/editor/ui/hooks/use-grid-style-editing';
import type { GridGroup } from '@/features/template';

interface GridStylePanelProps {
  group: GridGroup;
}

export const GridStylePanel = ({ group }: GridStylePanelProps) => {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const rectangles = currentImage?.rectangles ?? [];
  const gridStyleEditing = useGridStyleEditing(group, rectangles);
  const representativeRect = rectangles.find(rect => rect.id === group.rectIds[0]);

  if (!representativeRect || !gridStyleEditing) {
    return null;
  }

  return (
    <>
      <p className="editor-sidebar__grid-group-badge">
        {t('editor.gridGroupBadge', {
          cols: group.cols,
          rows: group.rows,
        })}
      </p>
      <AreaStyleControls
        rectangle={representativeRect}
        variant="sidebar"
        editing={gridStyleEditing}
      />
    </>
  );
};
