import './toolbar.scss'

import {
    LargeArrowLeftIcon,
    LargeArrowRightIcon,
} from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'
import { useHistoryStore } from '@/stores/history-store'
import { FIELD_TYPE_CONFIG } from '@/types/planner'
import { useManageAreas } from '@/hooks/use-manage-areas'
import { useCurrentImage } from '@/hooks/use-current-image'
import { useTemplateId } from '@/hooks/use-template-id'
import { AreaStyleControls } from '@/components/shared/area-style-controls'
import { BlockDeleteButton } from '@/components/shared/block-delete-button'
import { BlockTypeSelector } from '@/components/shared/block-type-selector'
import { EditorPlannerActions } from '@/components/shared/editor-planner-actions'
import { useEffect, useRef } from 'react'

export const Toolbar = () => {
    const templateId = useTemplateId();
    const currentImage = useCurrentImage();
    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId)
    const currentSelectedBox = selectedRectangleId ? currentImage?.rectangles?.find(rectangle => selectedRectangleId === rectangle.id) : null
    const toolbarRef = useRef<HTMLDivElement>(null)

    const canUndo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.past.length ?? 0) > 0 : false
    )
    const canRedo = useHistoryStore(state =>
      templateId ? (state.histories[templateId]?.future.length ?? 0) > 0 : false
    )
    const undo = useHistoryStore(state => state.undo)
    const redo = useHistoryStore(state => state.redo)

  useEffect(() => {
    const toolbarEl = toolbarRef.current
    const contentEl = toolbarEl?.closest('.editor-board__main__content') as HTMLElement | null
    const mainEl = contentEl?.closest('.editor-board__main') as HTMLElement | null
    const sidebarEl = mainEl?.querySelector('.editor-sidebar') as HTMLElement | null
    const canvasEl = contentEl?.querySelector('.template-canva') as HTMLElement | null
    const pagesMapEl = contentEl?.querySelector('.pages-map') as HTMLElement | null
    const popovers = toolbarEl?.querySelectorAll('.area-style-controls__popover, .block-type-selector__menu') ?? []

    let popoverOverflow = 0
    popovers.forEach(node => {
      const rect = node.getBoundingClientRect()
      if (toolbarEl) {
        const toolbarRect = toolbarEl.getBoundingClientRect()
        popoverOverflow = Math.max(popoverOverflow, rect.bottom - toolbarRect.bottom)
      }
    })

    const data = {
      hasSelection: Boolean(currentSelectedBox),
      toolbarClass: toolbarEl?.className ?? null,
      toolbarHeight: toolbarEl?.offsetHeight ?? null,
      toolbarTop: toolbarEl?.getBoundingClientRect().top ?? null,
      sidebarHeight: sidebarEl?.offsetHeight ?? null,
      mainHeight: mainEl?.clientHeight ?? null,
      contentScrollHeight: contentEl?.scrollHeight ?? null,
      contentClientHeight: contentEl?.clientHeight ?? null,
      contentOverflowY: contentEl ? contentEl.scrollHeight - contentEl.clientHeight : null,
      canvasTop: canvasEl?.getBoundingClientRect().top ?? null,
      pagesMapTop: pagesMapEl?.getBoundingClientRect().top ?? null,
      popoverCount: popovers.length,
      maxPopoverOverflowBelowToolbar: popoverOverflow,
      toolbarWidth: toolbarEl?.offsetWidth ?? null,
    }

    // #region agent log
    fetch('http://127.0.0.1:7932/ingest/3fc88f16-2474-4f34-a675-a1760ae34472',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d7f9fa'},body:JSON.stringify({sessionId:'d7f9fa',runId:'post-fix-v2',location:'toolbar.tsx:layout-metrics',message:'Toolbar layout metrics on selection change',data,hypothesisId:'H6-sidebar-stretch',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [currentSelectedBox, selectedRectangleId])
   

    const { updateAreaType } = useManageAreas();

    if(!currentSelectedBox) {
        return (
            <div ref={toolbarRef} className='base-toolbar'>
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
                <EditorPlannerActions variant="toolbar" />
            </div>
        );
    }

    const config = FIELD_TYPE_CONFIG[currentSelectedBox.fieldType];
    const order = currentImage.rectangles.filter(({fieldType}) => fieldType === currentSelectedBox.fieldType).findIndex(({id}) => id === currentSelectedBox.id)

    return (
        <div ref={toolbarRef} className="toolbar">
             <p className='toolbar__name'>{config.label} {order + 1}</p>
             <div className='toolbar__divider' />
             <AreaStyleControls rectangle={currentSelectedBox} variant="toolbar" />
             <div className='toolbar__divider' />
             <BlockTypeSelector
                currentType={currentSelectedBox.fieldType}
                onSelect={type => updateAreaType(currentSelectedBox.id, type)}
                variant="popover"
             />
             <BlockDeleteButton
                rectangleId={currentSelectedBox.id}
                className="toolbar__delete-button"
             />
        </div>
    )
}
