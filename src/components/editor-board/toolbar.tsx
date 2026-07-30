import { Trash2 } from 'lucide-react'

import {
    SparklesIcon,
    EyeIcon,
    EyeClosedIcon,
} from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'
import { FIELD_TYPE_CONFIG, FieldType } from '@/types/planner'
import { useManageAreas } from '@/hooks/use-manage-areas'
import { useCurrentImage } from '@/hooks/use-current-image'
import './toolbar.scss'
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FIELD_ICONS } from '../sidebar/FieldTypeSelector';
import useOnClickOutside from '@/core/hooks/use-on-click-outside'
import { useCurrentTemplate } from '@/hooks/use-current-template'

export const Toolbar = () => {
    const template = useCurrentTemplate();
    const currentImage = useCurrentImage();
    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId)
    const currentSelectedBox = selectedRectangleId ? currentImage?.rectangles?.find(rectangle => selectedRectangleId === rectangle.id) : null
    const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides)
    const setShowRectangleGuides = useTemplateStore(state => state.setShowRectangleGuides)
    const openGenerator = useTemplateStore(state => state.openGenerator)
   

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
                <Trash2 className="toolbar__delete-button__icon" />
            </button>
            
        </div>
    )
}