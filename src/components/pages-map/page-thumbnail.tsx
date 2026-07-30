import { useTemplateStore } from "@/stores/template-store";
import { TemplateImage } from "@/types/planner";
import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useOnClickOutside from "@/core/hooks/use-on-click-outside";
import './page-thumbnail.scss'
import { useManageImages } from "@/hooks/use-manage-images";
import { Trash } from "lucide-react";

interface Props {
    image: TemplateImage;
}

export const PageThumbnail = ({image}: Props) => {
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const contextMenuRef = useRef<HTMLUListElement>(null);
    const thumbnailRef = useRef<HTMLDivElement>(null);
    const { setCurrentImage } = useTemplateStore();
    const clearSelection = useTemplateStore(state => state.clearSelection)
    const {deleteImage} = useManageImages();

    const closeContextMenu = useCallback(() => {
        setIsContextMenuOpen(false);
        setMenuPosition(null);
    }, []);

    useOnClickOutside(contextMenuRef, () => {
        if(!isContextMenuOpen) return;
        closeContextMenu();
    });

    const selectPage = () => {
        clearSelection()
        setCurrentImage(image.id)
    }

    const openContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = thumbnailRef.current?.getBoundingClientRect();
        if (!rect) return;

        setMenuPosition({
            top: rect.top - 8,
            left: rect.left + rect.width / 2,
        });
        setIsContextMenuOpen(true);
    };

    const handleDelete = async () => {
        closeContextMenu();
        await deleteImage(image.id);
    };

    return (
        <div
            ref={thumbnailRef}
            className={clsx('page-thumbnail', {
                'page-thumbnail--menu-open': isContextMenuOpen,
            })}
        >
            <button 
            className='page-thumbnail__button'
            onClick={selectPage} 
            onContextMenu={openContextMenu}
            >
                <img className='page-thumbnail__button__img' alt={image.name} src={image.src} />
            </button>

            {isContextMenuOpen && menuPosition && createPortal(
                <ul 
                ref={contextMenuRef}
                className="page-thumbnail__context-menu page-thumbnail__context-menu--visible"
                style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                }}
                >
                    <li className="page-thumbnail__context-menu__li">
                        <button
                            type="button"
                            className="page-thumbnail__context-menu__li__button"
                            onClick={handleDelete}
                        >
                            <Trash className="page-thumbnail__context-menu__li__button__icon" />
                            <p>Eliminar esta página</p>
                        </button>
                    </li>
                </ul>,
                document.body
            )}
        </div>
    )
}
