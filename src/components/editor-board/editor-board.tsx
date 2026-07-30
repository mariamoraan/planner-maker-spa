import { TemplateCanvas } from "../canvas/TemplateCanvas"
import { PagesMap } from "../pages-map/pages-map"
import { Toolbar } from "./toolbar"
import './editor-board.scss'
import { EditorSidebar } from "../sidebar/editor-sidebar"

export const EditorBoard = () => {
    return (
        <div className="editor-board">
            <div className="editor-board__main">
                <EditorSidebar />
                <div className="editor-board__main__content">
                    <Toolbar />
                    <TemplateCanvas />
                    <PagesMap />
                </div>
            </div>
        </div>
    )
}