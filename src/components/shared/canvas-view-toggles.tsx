import './canvas-view-toggles.scss'

import { useTranslation } from 'react-i18next'
import { EyeIcon, EyeClosedIcon, GridIcon } from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'

interface CanvasViewTogglesProps {
  variant: 'toolbar' | 'sidebar'
}

export const CanvasViewToggles = ({ variant }: CanvasViewTogglesProps) => {
  const { t } = useTranslation()
  const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides)
  const setShowRectangleGuides = useTemplateStore(state => state.setShowRectangleGuides)
  const showGrid = useTemplateStore(state => state.showGrid)
  const setShowGrid = useTemplateStore(state => state.setShowGrid)

  const isToolbar = variant === 'toolbar'

  return (
    <div className={`canvas-view-toggles canvas-view-toggles--${variant}`}>
      <button
        className="canvas-view-toggles__guides"
        type="button"
        onClick={() => setShowRectangleGuides(!showRectangleGuides)}
        title={showRectangleGuides ? t('editor.hideGuides') : t('editor.showGuides')}
      >
        {showRectangleGuides ? <EyeIcon /> : <EyeClosedIcon />}
        {!isToolbar && (showRectangleGuides ? t('editor.hideGuides') : t('editor.showGuides'))}
      </button>
      <button
        className={`canvas-view-toggles__grid${showGrid ? ' canvas-view-toggles__grid--active' : ''}`}
        type="button"
        onClick={() => setShowGrid(!showGrid)}
        title={showGrid ? t('editor.hideGrid') : t('editor.showGrid')}
      >
        <GridIcon className={isToolbar ? undefined : 'canvas-view-toggles__icon'} />
        {!isToolbar && (showGrid ? t('editor.hideGrid') : t('editor.showGrid'))}
      </button>
    </div>
  )
}
