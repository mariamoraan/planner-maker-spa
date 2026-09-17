import './toolbar.scss'
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

import { useTranslation } from 'react-i18next'
import { FIELD_TYPE_CONFIG } from '@/features/template'
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas'
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image'
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls'
import { BindingSourceControls } from '@/features/editor/ui/components/shared/binding-source-controls'
import { CalendarRolePicker } from '@/features/editor/ui/components/shared/calendar-role-picker'
import { CompositePartsEditor } from '@/features/editor/ui/components/shared/composite-parts-editor'
import { BlockDeleteButton } from '@/features/editor/ui/components/shared/block-delete-button'
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector'
import { EditorPlannerActions } from '@/features/export/ui/components/editor-planner-actions/editor-planner-actions'
import { LayerControls } from '@/features/editor/ui/components/shared/layer-controls'
import { ToolbarHistoryButtons } from '@/features/editor/ui/components/shared/toolbar-history-buttons'
import {
  canGroupSelection,
  getGridGroupForSelection,
} from '@/features/editor/domain/services/grid-group'
import {
  pageAllowsDateRoleChoice,
  resolveEffectiveBindingSource,
  suggestedCalendarRoleForPage,
} from '@/features/editor/domain/services/binding-group'
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops'
import { useBindingGroupOps } from '@/features/editor/ui/hooks/use-binding-group-ops'
import { useSelectionStyleEditing } from '@/features/editor/ui/hooks/use-selection-style-editing'
import { GridToolbarControls } from './grid-toolbar-controls'
import { GridIcon, TrashIcon } from '@/core/icons'

export const Toolbar = () => {
    const { t } = useTranslation();
    const currentImage = useCurrentImage();
    const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds)
    const currentSelectedBox =
      selectedRectangleIds.length === 1
        ? currentImage?.rectangles?.find(rectangle => selectedRectangleIds[0] === rectangle.id)
        : null

    const lockedGridGroup = getGridGroupForSelection(
      selectedRectangleIds,
      currentImage?.gridGroups,
    );
    const rectangles = currentImage?.rectangles ?? [];
    const canGroup = canGroupSelection(selectedRectangleIds, rectangles);
    const { groupSelectionAsGrid } = useGridGroupOps();
    const { groupSelectionBinding } = useBindingGroupOps();
    const { updateAreaType, deleteAreas } = useManageAreas();
    const selectionStyleEditing = useSelectionStyleEditing(
      selectedRectangleIds.length > 1 ? selectedRectangleIds : [],
    );

    if (lockedGridGroup) {
        return (
            <div className="toolbar toolbar--grid">
                <GridToolbarControls group={lockedGridGroup} />
            </div>
        );
    }

    if (selectedRectangleIds.length > 1) {
        const showUseAsCalendar =
          currentImage != null && pageAllowsDateRoleChoice(currentImage.type);
        const styleRect =
          currentImage?.rectangles.find(r => r.id === selectedRectangleIds[0]) ?? null;

        return (
            <div className="toolbar toolbar--multi">
                <p
                  className="toolbar__name toolbar__name--count"
                  title={t('editor.blocksSelected', { count: selectedRectangleIds.length })}
                >
                    {t('editor.blocksSelectedShort', { count: selectedRectangleIds.length })}
                </p>
                <div className="toolbar__divider" />
                <LayerControls selectedIds={selectedRectangleIds} />
                {styleRect && selectionStyleEditing ? (
                  <>
                    <div className="toolbar__divider" />
                    <AreaStyleControls
                      rectangle={styleRect}
                      variant="toolbar"
                      editing={selectionStyleEditing}
                    />
                  </>
                ) : null}
                {showUseAsCalendar ? (
                  <>
                    <div className="toolbar__divider" />
                    <div className="toolbar__icon-actions">
                      {canGroup ? (
                        <button
                          type="button"
                          className="toolbar__icon-btn"
                          onClick={() => groupSelectionAsGrid([...selectedRectangleIds])}
                          title={t('editor.gridGroupAsGrid')}
                          aria-label={t('editor.gridGroupAsGrid')}
                        >
                          <GridIcon size={16} />
                        </button>
                      ) : null}
                      <CalendarRolePicker
                        value={(() => {
                          const sources = selectedRectangleIds
                            .map(id => currentImage.rectangles.find(r => r.id === id))
                            .filter(Boolean)
                            .map(rect => resolveEffectiveBindingSource(rect!, currentImage));
                          const first = sources[0];
                          return sources.length > 0 && sources.every(s => s === first)
                            ? first
                            : null;
                        })()}
                        suggested={suggestedCalendarRoleForPage(currentImage.type)}
                        onSelect={source =>
                          groupSelectionBinding([...selectedRectangleIds], source)
                        }
                        variant="icon"
                      />
                    </div>
                  </>
                ) : canGroup ? (
                  <>
                    <div className="toolbar__divider" />
                    <div className="toolbar__icon-actions">
                      <button
                        type="button"
                        className="toolbar__icon-btn"
                        onClick={() => groupSelectionAsGrid([...selectedRectangleIds])}
                        title={t('editor.gridGroupAsGrid')}
                        aria-label={t('editor.gridGroupAsGrid')}
                      >
                        <GridIcon size={16} />
                      </button>
                    </div>
                  </>
                ) : null}
                <div className="toolbar__divider" />
                <button
                    type="button"
                    className="toolbar__icon-btn toolbar__icon-btn--danger"
                    onClick={() => deleteAreas([...selectedRectangleIds])}
                    title={t('editor.deleteSelected')}
                    aria-label={t('editor.deleteSelected')}
                >
                    <TrashIcon size={16} />
                </button>
            </div>
        );
    }

    if(!currentSelectedBox) {
        return (
            <div className='base-toolbar'>
                <ToolbarHistoryButtons />
                <EditorPlannerActions variant="toolbar" />
            </div>
        );
    }

    const config = FIELD_TYPE_CONFIG[currentSelectedBox.fieldType];
    const showDateRole =
      currentImage != null &&
      pageAllowsDateRoleChoice(currentImage.type) &&
      !currentSelectedBox.gridGroupId;

    return (
        <div className="toolbar">
             <p className='toolbar__name'>
               {config.label}
             </p>
             {showDateRole ? (
               <>
                 <div className='toolbar__divider' />
                 <BindingSourceControls rectangle={currentSelectedBox} variant="toolbar" />
               </>
             ) : null}
             {currentSelectedBox.fieldType === 'composite' ? (
               <>
                 <div className='toolbar__divider' />
                 <CompositePartsEditor rectangle={currentSelectedBox} />
               </>
             ) : null}
             <div className='toolbar__divider' />
             <AreaStyleControls rectangle={currentSelectedBox} variant="toolbar" />
             <div className='toolbar__divider' />
             <BlockTypeSelector
                currentType={currentSelectedBox.fieldType}
                onSelect={type => updateAreaType(currentSelectedBox.id, type)}
                variant="popover"
             />
             <div className='toolbar__divider' />
             <LayerControls selectedIds={selectedRectangleIds} />
             <BlockDeleteButton
                rectangleId={currentSelectedBox.id}
                className="toolbar__delete-button"
             />
        </div>
    )
}
