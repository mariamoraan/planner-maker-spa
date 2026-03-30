import { useTemplateStore } from "@/stores/template-store";
import { TemplateImage } from "@/types/planner";
import clsx from "clsx";
import { useRef, useState } from "react";
import useOnClickOutside from "@/core/hooks/use-on-click-outside";
import './page-thumbnail.scss'
import { useManageImages } from "@/hooks/use-manage-images";
import { Trash } from "lucide-react";

interface Props {
    image: TemplateImage;
}

export const PageThumbnail = ({image}: Props) => {
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const contextMenuRef = useRef();
    const { setCurrentImage } = useTemplateStore();
    const setSelectedRectangleId = useTemplateStore(state => state.setSelectedRectangleId)
    const {deleteImage} = useManageImages();
    useOnClickOutside(contextMenuRef, () => {
        if(!isContextMenuOpen) return;
        setIsContextMenuOpen(false)
    })
    const selectPage = () => {
        setSelectedRectangleId(null)
        setCurrentImage(image.id)
    }
    return (
        <div className="page-thumbnail">
            <button 
            className='page-thumbnail__button'
            onClick={selectPage} 
            onContextMenu={(e) => {
                e.preventDefault();
                setIsContextMenuOpen(true)
            }}
            >
                <img className='page-thumbnail__button__img' alt={image.name} src={image.src} />
            </button>

            <ul 
            ref={contextMenuRef} 
            className={clsx('page-thumbnail__context-menu', {
                'page-thumbnail__context-menu--visible': isContextMenuOpen,
            })}>
                <li className="page-thumbnail__context-menu__li">
                    <button className="page-thumbnail__context-menu__li__button" onClick={() => deleteImage(image.id)}>
                        <Trash className="page-thumbnail__context-menu__li__button__icon" />
                        <p>Eliminar esta página</p>
                    </button>
                </li>
            </ul>
        </div>
    )
}