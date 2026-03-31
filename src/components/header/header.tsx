import { Home, Sparkles } from 'lucide-react'
import { useTemplateStore } from '@/stores/template-store'
import './header.scss'
import { Link } from 'react-router-dom'
import { PATHS } from '@/core/routes/paths'

export const Header = () => {
    const openGenerator = useTemplateStore(state => state.openGenerator)
    const getCurrentTemplate = useTemplateStore(state => state.getCurrentTemplate)
    const template = getCurrentTemplate();
    return (
        <div className='header'>
            <Link className='header__home-link' to={PATHS.home}>
              <Home width={24} height={24} />
            </Link>
            <p className='header__template-name'>
              {template.name}
            </p>
            <button 
            className="header__generate-planner-button"
            onClick={openGenerator}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Planner
          </button>
        </div>
    )
}