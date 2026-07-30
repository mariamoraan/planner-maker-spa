import './editor-planner-actions.scss'

import { useTranslation } from 'react-i18next'
import { SparklesIcon } from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'
import { useExportStore } from '@/stores/export-store'
import { CanvasViewToggles } from '@/components/shared/canvas-view-toggles'

interface EditorPlannerActionsProps {
  variant: 'toolbar' | 'sidebar'
}

export const EditorPlannerActions = ({ variant }: EditorPlannerActionsProps) => {
  const { t } = useTranslation()
  const openGenerator = useTemplateStore(state => state.openGenerator)
  const exportStatus = useExportStore(state => state.status)
  const isExportRunning = exportStatus === 'running'
  const exportTitle = isExportRunning ? t('editor.exportInProgress') : undefined

  if (variant === 'toolbar') {
    return (
      <div className="editor-planner-actions editor-planner-actions--toolbar">
        <button
          className="editor-planner-actions__generate editor-planner-actions__generate--toolbar"
          type="button"
          onClick={openGenerator}
          disabled={isExportRunning}
          title={exportTitle}
        >
          {t('editor.generatePlanner')}
        </button>
        <CanvasViewToggles variant="toolbar" />
      </div>
    )
  }

  return (
    <div className="editor-planner-actions editor-planner-actions--sidebar">
      <button
        className="editor-planner-actions__generate editor-planner-actions__generate--sidebar"
        type="button"
        onClick={openGenerator}
        disabled={isExportRunning}
        title={exportTitle}
      >
        <SparklesIcon className="editor-planner-actions__icon" />
        {t('editor.generatePlanner')}
      </button>
      <CanvasViewToggles variant="sidebar" />
    </div>
  )
}
