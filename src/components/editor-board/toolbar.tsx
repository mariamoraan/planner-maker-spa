import './toolbar.scss'

import {
    LargeArrowLeftIcon,
    LargeArrowRightIcon,
} from '@/core/icons'
import { useTranslation } from 'react-i18next'
import { useTemplateStore } from '@/stores/template-store'
import { useHistoryStore } from '@/stores/history-store'
import { FIELD_TYPE_CONFIG } from '@/types/planner'
import { useManageAreas } from '@/hooks/use-manage-areas'
import { useCurrentImage } from '@/hooks/use-current-image'
import { useTemplateId } from '@/hooks/use-template-id'
import { AreaStyleControls } from '@/components/shared/area-style-controls'
import { BlockDeleteButton } from '@/components/shared/block-delete-button'
import { BlockTypeSelector } from '@/components/shared/block-type-selector'
import { EditorPlannerActions } from '@/components/shared/editor-planner-actions'

export const Toolbar = () => {
    const { t } = useTranslation();
    const templateId = useTemplateId();
    const currentImage = useCurrentImage();
    const selectedRectangleIds = useTemplateStore(state => state.selectedRectangleIds)
    const currentSelectedBox =
      selectedRectangleIds.length === 1
        ? currentImage?.rectangles?.find(rectangle => selectedRectangleIds[0] === rectangle.id)
        : null

    const canUndo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.past.length ?? 0) > 0 : false
    )
    const canRedo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.future.length ?? 0) > 0 : false
    )
    const undo = useHistoryStore(state => state.undo)
    const redo = useHistoryStore(state => state.redo)

    const { updateAreaType, deleteAreas } = useManageAreas();

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
