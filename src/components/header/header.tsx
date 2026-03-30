import Button from '@mui/material/Button'
import { Sparkles } from 'lucide-react'
import { useTemplateStore } from '@/stores/template-store'
import './header.scss'

export const Header = () => {
    const openGenerator = useTemplateStore(state => state.openGenerator)
    return (
        <div className='header'>
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