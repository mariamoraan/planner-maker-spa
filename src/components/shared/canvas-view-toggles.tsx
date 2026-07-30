import './canvas-view-toggles.scss'

import { useTranslation } from 'react-i18next'
import { EyeIcon, EyeClosedIcon, HandIcon, MousePointer2Icon, RulerIcon } from '@/core/icons'
import { useTemplateStore, type CanvasTool } from '@/stores/template-store'

interface CanvasViewTogglesProps {
  variant: 'toolbar' | 'sidebar' | 'floating'
}

export const CanvasViewToggles = ({ variant }: CanvasViewTogglesProps) => {
  const { t } = useTranslation()
  const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides)
  const setShowRectangleGuides = useTemplateStore(state => state.setShowRectangleGuides)
  const canvasTool = useTemplateStore(state => state.canvasTool)
  const setCanvasTool = useTemplateStore(state => state.setCanvasTool)

  const isToolbar = variant === 'toolbar'
  const isFloating = variant === 'floating'

  const toolButtonClass = (tool: CanvasTool) =>
    `canvas-view-toggles__tool${canvasTool === tool ? ' canvas-view-toggles__tool--active' : ''}`

  const guidesButtonClass = `canvas-view-toggles__guides${showRectangleGuides ? ' canvas-view-toggles__tool--active' : ''}`

  return (
    <div className={`canvas-view-toggles canvas-view-toggles--${variant}`}>
      <button
        className={toolButtonClass('select')}
        type="button"
        onClick={() => setCanvasTool('select')}
        title={t('editor.selectTool')}
      >
        <MousePointer2Icon />
        {!isToolbar && !isFloating && t('editor.selectTool')}
      </button>
      <button
        className={toolButtonClass('pan')}
        type="button"
        onClick={() => setCanvasTool('pan')}
        title={t('editor.panTool')}
      >
        <HandIcon />
        {!isToolbar && !isFloating && t('editor.panTool')}
      </button>
      <button
        className={toolButtonClass('measure')}
        type="button"
        onClick={() => setCanvasTool('measure')}
        title={t('editor.measureTool')}
      >
        <RulerIcon />
        {!isToolbar && !isFloating && t('editor.measureTool')}
      </button>
      <button
        className={guidesButtonClass}
        type="button"
        onClick={() => setShowRectangleGuides(!showRectangleGuides)}
        title={showRectangleGuides ? t('editor.hideGuides') : t('editor.showGuides')}
      >
        {showRectangleGuides ? <EyeIcon /> : <EyeClosedIcon />}
        {!isToolbar && !isFloating && (showRectangleGuides ? t('editor.hideGuides') : t('editor.showGuides'))}
      </button>
    </div>
  )
}
