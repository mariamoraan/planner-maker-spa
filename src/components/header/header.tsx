import './header.scss'

import {
  HomeIcon, 
  SparklesIcon,
  EyeIcon,
  EyeClosedIcon,
} from '@/core/icons'
import { useTemplateStore } from '@/stores/template-store'
import { useExportStore } from '@/stores/export-store'
import { Link } from 'react-router-dom'
import { PATHS } from '@/core/routes/paths'
import { useCurrentTemplate } from '@/hooks/use-current-template'

export const Header = () => {
  const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides)
  const setShowRectangleGuides = useTemplateStore(state => state.setShowRectangleGuides)
  const openGenerator = useTemplateStore(state => state.openGenerator)
  const exportStatus = useExportStore(state => state.status)
  const template = useCurrentTemplate();
  const isExportRunning = exportStatus === 'running'

  const toggleRectangleGuides = () => {
    setShowRectangleGuides(!showRectangleGuides)
  }

    return (
        <div className='header'>
            <Link className='header__home-link' to={PATHS.home}>
              <HomeIcon width={24} height={24} />
            </Link>
            <p className='header__template-name'>
              {template?.name}
            </p>
            <button 
            className="header__generate-planner-button"
            onClick={openGenerator}
            disabled={isExportRunning}
            title={isExportRunning ? 'Export in progress…' : undefined}
          >
            <SparklesIcon className="header__generate-planner-icon" />
            Generate Planner
          </button>
          <button  className="header__show-guides-button" onClick={toggleRectangleGuides}>
            {showRectangleGuides ? <EyeIcon /> : <EyeClosedIcon />}
            {showRectangleGuides ? 'Hide Guides' : 'Show Guides'}
          </button>
        </div>
    )
}
