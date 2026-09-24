import './binding-source-controls.scss';

import type { BindingSourceKind, Rectangle } from '@/features/template';
import {
  pageAllowsDateRoleChoice,
  resolveEffectiveBindingSource,
} from '@/features/editor/domain/services/binding-group';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useBindingGroupOps } from '@/features/editor/ui/hooks/use-binding-group-ops';
import { CalendarRolePicker } from '@/features/editor/ui/components/shared/calendar-role-picker';
import { useTranslation } from 'react-i18next';

interface BindingSourceControlsProps {
  rectangle: Rectangle;
  /**
   * `toolbar` / `sidebar` — loose block (hidden for grid cells).
   * `grid` — grid toolbar (edits the whole grid’s calendar role).
   */
  variant?: 'toolbar' | 'sidebar' | 'grid';
  /** Layout grid id when variant is `grid`. */
  gridGroupId?: string;
}

export function BindingSourceControls({
  rectangle,
  variant = 'toolbar',
  gridGroupId,
}: BindingSourceControlsProps) {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const { setRectangleBindingSource, setGroupBindingSource, setGridCalendarRole } =
    useBindingGroupOps();

  if (!currentImage) return null;
  if (!pageAllowsDateRoleChoice(currentImage.type)) return null;

  const isGridVariant = variant === 'grid';
  const isGridCell = Boolean(rectangle.gridGroupId);
  const resolvedGridId = gridGroupId ?? rectangle.gridGroupId;

  // Grid cells: role is edited on the grid toolbar, not per cell.
  if (isGridCell && !isGridVariant) return null;

  const source = resolveEffectiveBindingSource(rectangle, currentImage);
  const sharedGroupId = rectangle.bindingGroupId;
  const memberCount = sharedGroupId
    ? currentImage.rectangles.filter(r => r.bindingGroupId === sharedGroupId).length
    : 0;

  const handleSourceChange = (next: BindingSourceKind) => {
    if (isGridVariant && resolvedGridId) {
      setGridCalendarRole(resolvedGridId, next);
      return;
    }
    if (
      sharedGroupId &&
      memberCount > 1 &&
      currentImage.bindingGroups?.[sharedGroupId]
    ) {
      setGroupBindingSource(sharedGroupId, next);
      return;
    }
    setRectangleBindingSource(rectangle.id, next);
  };

  return (
    <div
      className={`binding-source-controls binding-source-controls--${isGridVariant ? 'grid' : variant}`}
    >
      <CalendarRolePicker
        value={source}
        onSelect={handleSourceChange}
        variant="button"
        pageType={currentImage.type}
        triggerTitle={t(
          isGridVariant ? 'editor.calendarRoleGridShows' : 'editor.calendarRoleShows',
        )}
      />
    </div>
  );
}
