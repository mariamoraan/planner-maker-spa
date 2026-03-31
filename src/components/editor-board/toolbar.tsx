import { Trash2 } from 'lucide-react'

import { useTemplateStore } from '@/stores/template-store'
import { FIELD_TYPE_CONFIG, FieldType } from '@/types/planner'
import { useManageAreas } from '@/hooks/use-manage-areas'
import './toolbar.scss'
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FIELD_ICONS } from '../sidebar/FieldTypeSelector';
import useOnClickOutside from '@/core/hooks/use-on-click-outside'

export const Toolbar = () => {
    const getCurrentImage = useTemplateStore(state => state.getCurrentImage)
    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId)
    const { updateAreaType, deleteArea} = useManageAreas();
    const [isEditAreaTypeMenuOpen, setIsEditAreaTypeMenuOpen] = useState(false);
    const editAreaTypeMenuRef = useRef();

    useOnClickOutside(editAreaTypeMenuRef, () => {
        setIsEditAreaTypeMenuOpen(false)
    })

    const currentImage = getCurrentImage();
    const currentSelectedBox = selectedRectangleId ? currentImage?.rectangles?.find(rectangle => selectedRectangleId === rectangle.id) : null

    useEffect(() => {
        setIsEditAreaTypeMenuOpen(false)
    }, [currentSelectedBox])


    if(!currentSelectedBox) {
        return <div className='void-toolbar' />;
    }

    const config = FIELD_TYPE_CONFIG[currentSelectedBox.fieldType];
    const order = currentImage.rectangles.filter(({fieldType}) => fieldType === currentSelectedBox.fieldType).findIndex(({id}) => id === currentSelectedBox.id)

    return (
        <div className="toolbar">
             <p className='toolbar__name'>{config.label} {order + 1}</p>
             <div className='toolbar__divider' />
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsEditAreaTypeMenuOpen(true)
                }}
                className='toolbar__edit-button'
            >
                Editar Tipo
                <div ref={editAreaTypeMenuRef} className={clsx('toolbar__change-area-type-menu', {'toolbar__change-area-type-menu--visible': isEditAreaTypeMenuOpen})}>
                    <div className='toolbar__change-area-type-menu__options'>
                    {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map(type => (
                        <div onClick={() => updateAreaType(currentSelectedBox.id, type)}>{FIELD_ICONS[type]}</div>
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
                <Trash2 className="toolbar__delete-button__icon" />
            </button>
            
        </div>
    )
}