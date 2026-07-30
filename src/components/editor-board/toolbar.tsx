import './toolbar.scss'

import {
    EyeIcon,
    EyeClosedIcon,
    TrashIcon,
    LargeArrowLeftIcon,
    LargeArrowRightIcon,
} from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'
import { useHistoryStore } from '@/stores/history-store'
import { FIELD_TYPE_CONFIG, FieldType } from '@/types/planner'
import { useManageAreas } from '@/hooks/use-manage-areas'
import { useCurrentImage } from '@/hooks/use-current-image'
import { useTemplateId } from '@/hooks/use-template-id'
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FIELD_ICONS } from '../sidebar/FieldTypeSelector';
import useOnClickOutside from '@/core/hooks/use-on-click-outside'

export const Toolbar = () => {
    const templateId = useTemplateId();
    const currentImage = useCurrentImage();
    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId)
    const currentSelectedBox = selectedRectangleId ? currentImage?.rectangles?.find(rectangle => selectedRectangleId === rectangle.id) : null
    const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides)
    const setShowRectangleGuides = useTemplateStore(state => state.setShowRectangleGuides)
    const openGenerator = useTemplateStore(state => state.openGenerator)

    const canUndo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.past.length ?? 0) > 0 : false
    )
    const canRedo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.future.length ?? 0) > 0 : false
    )
    const undo = useHistoryStore(state => state.undo)
    const redo = useHistoryStore(state => state.redo)
   

  const toggleRectangleGuides = () => {
    setShowRectangleGuides(!showRectangleGuides)
  }

    const { updateAreaType, deleteArea} = useManageAreas();
    const [isEditAreaTypeMenuOpen, setIsEditAreaTypeMenuOpen] = useState(false);
    const editAreaTypeMenuRef = useRef();

    useOnClickOutside(editAreaTypeMenuRef, () => {
        setIsEditAreaTypeMenuOpen(false)
    })

    useEffect(() => {
        setIsEditAreaTypeMenuOpen(false)
    }, [currentSelectedBox])


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
                <button 
                className="base-toolbar__generate-planner-button"
                onClick={openGenerator}
                >
                    Generate Planner
                </button>
                <button  className="base-toolbar__show-guides-button" onClick={toggleRectangleGuides}>
                    {showRectangleGuides ? <EyeIcon /> : <EyeClosedIcon />}
    
                </button>
            </div>
        );
    }

    const config = FIELD_TYPE_CONFIG[currentSelectedBox.fieldType];
    const order = currentImage.rectangles.filter(({fieldType}) => fieldType === currentSelectedBox.fieldType).findIndex(({id}) => id === currentSelectedBox.id)

    return (
        <div className="toolbar">
             <p className='toolbar__name'>{config.label} {order + 1}</p>
             <div className='toolbar__divider' />
             <button
            ref={editAreaTypeMenuRef} 
            onClick={(e) => {
                e.stopPropagation();
                setIsEditAreaTypeMenuOpen(!isEditAreaTypeMenuOpen)
            }}
            className='toolbar__edit-button'
            >
                Editar Tipo
                <div className={clsx('toolbar__change-area-type-menu', {'toolbar__change-area-type-menu--visible': isEditAreaTypeMenuOpen})}>
                    <div className='toolbar__change-area-type-menu__options'>
                    {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map(type => (
                        <div key={type} onClick={() => updateAreaType(currentSelectedBox.id, type)}>{FIELD_ICONS[type]}</div>
                    ))}
                    </div>
                </div>
            </button>
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    deleteArea(currentSelectedBox.id);
                }}
                className='toolbar__delete-button'
            >
                <TrashIcon className="toolbar__delete-button__icon" />
            </button>
            
        </div>
    )
}
