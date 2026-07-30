import './editor-planner-actions.scss'

import { EyeIcon, EyeClosedIcon, SparklesIcon } from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'
import { useExportStore } from '@/stores/export-store'

interface EditorPlannerActionsProps {
  variant: 'toolbar' | 'sidebar'
}

export const EditorPlannerActions = ({ variant }: EditorPlannerActionsProps) => {
  const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides)
  const setShowRectangleGuides = useTemplateStore(state => state.setShowRectangleGuides)
  const openGenerator = useTemplateStore(state => state.openGenerator)
  const exportStatus = useExportStore(state => state.status)
  const isExportRunning = exportStatus === 'running'

  const toggleRectangleGuides = () => {
    setShowRectangleGuides(!showRectangleGuides)
  }

  if (variant === 'toolbar') {
    return (
      <div className="editor-planner-actions editor-planner-actions--toolbar">
        <button
          className="editor-planner-actions__generate editor-planner-actions__generate--toolbar"
          type="button"
          onClick={openGenerator}
          disabled={isExportRunning}
          title={isExportRunning ? 'Export in progress…' : undefined}
        >
          Generate Planner
        </button>
        <button
          className="editor-planner-actions__guides editor-planner-actions__guides--toolbar"
          type="button"
          onClick={toggleRectangleGuides}
        >
          {showRectangleGuides ? <EyeIcon /> : <EyeClosedIcon />}
        </button>
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
        title={isExportRunning ? 'Export in progress…' : undefined}
      >
        <SparklesIcon className="editor-planner-actions__icon" />
        Generate Planner
      </button>
      <button
        className="editor-planner-actions__guides editor-planner-actions__guides--sidebar"
        type="button"
        onClick={toggleRectangleGuides}
      >
        {showRectangleGuides ? <EyeIcon /> : <EyeClosedIcon />}
        {showRectangleGuides ? 'Hide Guides' : 'Show Guides'}
      </button>
    </div>
  )
}
