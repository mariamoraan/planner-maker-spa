import './canvas-view-toggles.scss'

import { useTranslation } from 'react-i18next'
import { EyeIcon, EyeClosedIcon } from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'

interface CanvasViewTogglesProps {
  variant: 'toolbar' | 'sidebar'
}

export const CanvasViewToggles = ({ variant }: CanvasViewTogglesProps) => {
  const { t } = useTranslation()
  const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides)
  const setShowRectangleGuides = useTemplateStore(state => state.setShowRectangleGuides)

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
    </div>
  )
}
