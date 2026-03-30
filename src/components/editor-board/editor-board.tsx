import { TemplateCanvas } from "../canvas/TemplateCanvas"
import { PagesMap } from "../pages-map/pages-map"
import './editor-board.scss'
import { Toolbar } from "./toolbar"

export const EditorBoard = () => {
    return (
        <div className="editor-board">
            <Toolbar />
            <TemplateCanvas />
            <PagesMap />
        </div>
    )
}