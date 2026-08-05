import './toolbar.scss'
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

import {
    LargeArrowLeftIcon,
    LargeArrowRightIcon,
} from '@/core/icons'
import { useTranslation } from 'react-i18next'
import { useHistoryStore } from '@/features/editor/ui/stores/history-store'
import { FIELD_TYPE_CONFIG } from '@/features/template'
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas'
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image'
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id'
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls'
import { BlockDeleteButton } from '@/features/editor/ui/components/shared/block-delete-button'
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector'
import { EditorPlannerActions } from '@/features/export/ui/components/editor-planner-actions/editor-planner-actions'
import { getGridGroupForSelection } from '@/features/editor/domain/services/grid-group'
import { GridToolbarControls } from './grid-toolbar-controls'

export const Toolbar = () => {
    const { t } = useTranslation();
    const templateId = useTemplateId();
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

    const canUndo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.past.length ?? 0) > 0 : false
    )
    const canRedo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.future.length ?? 0) > 0 : false
    )
    const undo = useHistoryStore(state => state.undo)
    const redo = useHistoryStore(state => state.redo)

    const { updateAreaType, deleteAreas } = useManageAreas();

    if (lockedGridGroup) {
        return (
            <div className="toolbar toolbar--grid">
                <GridToolbarControls group={lockedGridGroup} />
            </div>
        );
    }

    if (selectedRectangleIds.length > 1) {
        return (
            <div className="toolbar toolbar--multi">
                <p className="toolbar__name">
                    {t('editor.blocksSelected', { count: selectedRectangleIds.length })}
                </p>
                <div className="toolbar__divider" />
                <button
                    type="button"
                    className="toolbar__delete-button toolbar__delete-selected"
                    onClick={() => deleteAreas([...selectedRectangleIds])}
                >
                    {t('editor.deleteSelected')}
                </button>
            </div>
        );
    }

    if(!currentSelectedBox) {
        return (
            <div className='base-toolbar'>
                <button
                  className='base-toolbar__undo'
                  type="button"
                  disabled={!canUndo}
                  onClick={() => templateId && undo(templateId)}
                >
                  <LargeArrowLeftIcon />
                </button>
                <button
                  className='base-toolbar__redo'
                  type="button"
                  disabled={!canRedo}
                  onClick={() => templateId && redo(templateId)}
                >
                  <LargeArrowRightIcon />
                </button>
                <EditorPlannerActions variant="toolbar" />
            </div>
        );
    }

    const config = FIELD_TYPE_CONFIG[currentSelectedBox.fieldType];
    const order = currentImage!.rectangles.filter(({fieldType}) => fieldType === currentSelectedBox.fieldType).findIndex(({id}) => id === currentSelectedBox.id)

    return (
        <div className="toolbar">
             <p className='toolbar__name'>{config.label} {order + 1}</p>
             <div className='toolbar__divider' />
             <AreaStyleControls rectangle={currentSelectedBox} variant="toolbar" />
             <div className='toolbar__divider' />
             <BlockTypeSelector
                currentType={currentSelectedBox.fieldType}
                onSelect={type => updateAreaType(currentSelectedBox.id, type)}
                variant="popover"
             />
             <BlockDeleteButton
                rectangleId={currentSelectedBox.id}
                className="toolbar__delete-button"
             />
        </div>
    )
}
