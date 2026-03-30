import { TemplateCanvas } from "../canvas/TemplateCanvas"
import { Header } from "../header/header"
import { PagesMap } from "../pages-map/pages-map"
import { Toolbar } from "./toolbar"
import './editor-board.scss'
import { EditorSidebar } from "../sidebar/EditorSidebar"

export const EditorBoard = () => {
    return (
        <div className="editor-board">
            <Header />
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