import { TemplateCanvas } from "../canvas/TemplateCanvas"
import { PagesMap } from "../pages-map/pages-map"
import { Toolbar } from "./toolbar"
import './editor-board.scss'
import { EditorSidebar } from "../sidebar/editor-sidebar"
import { blockSelectionZoneProps } from "@/features/editor/domain/services/block-selection"
import { useClearBlockSelectionOnOutsideClick } from "@/features/editor/ui/hooks/use-clear-block-selection-on-outside-click"
import { useUndoRedoShortcuts } from "@/features/editor/ui/hooks/use-undo-redo-shortcuts"
import { EditorControlsTour } from "@/features/editor/ui/components/editor-controls-tour/editor-controls-tour"
import { EmptyPlannerSetup } from "@/features/editor/ui/components/empty-planner-setup/empty-planner-setup"
import { useCurrentImage } from "@/features/editor/ui/hooks/use-current-image"

export const EditorBoard = () => {
    const currentImage = useCurrentImage()
    useClearBlockSelectionOnOutsideClick()
    useUndoRedoShortcuts()

    return (
        <div className="editor-board">
            <div className="editor-board__main">
                <EditorSidebar />
                <div className="editor-board__main__content">
                <div className="editor-board__toolbar-slot" {...blockSelectionZoneProps} data-tour-anchor="toolbar">
                    <Toolbar />
                </div>
                    {currentImage ? <TemplateCanvas /> : <EmptyPlannerSetup />}
                    <PagesMap />
                </div>
            </div>
            {currentImage ? <EditorControlsTour /> : null}
        </div>
    )
}
