import './toolbar.scss'
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';

import { useTranslation } from 'react-i18next'
import { FIELD_TYPE_CONFIG } from '@/features/template'
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas'
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image'
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls'
import { BlockDeleteButton } from '@/features/editor/ui/components/shared/block-delete-button'
import { BlockTypeSelector } from '@/features/editor/ui/components/shared/block-type-selector'
import { EditorPlannerActions } from '@/features/export/ui/components/editor-planner-actions/editor-planner-actions'
import { LayerControls } from '@/features/editor/ui/components/shared/layer-controls'
import { ToolbarHistoryButtons } from '@/features/editor/ui/components/shared/toolbar-history-buttons'
import { getGridGroupForSelection } from '@/features/editor/domain/services/grid-group'
import { GridToolbarControls } from './grid-toolbar-controls'

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
                <LayerControls selectedIds={selectedRectangleIds} />
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
                <ToolbarHistoryButtons />
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
             <div className='toolbar__divider' />
             <LayerControls selectedIds={selectedRectangleIds} />
             <BlockDeleteButton
                rectangleId={currentSelectedBox.id}
                className="toolbar__delete-button"
             />
        </div>
    )
}
