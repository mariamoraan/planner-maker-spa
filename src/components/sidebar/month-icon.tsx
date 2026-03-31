import { FIELD_TYPE_CONFIG } from '@/types/planner';
import './month-icon.scss'
import { useTemplateStore } from '@/stores/template-store';

const CONFIG = FIELD_TYPE_CONFIG.month;

interface Props {
    width: number;
    height: number;
}

export const MonthIcon: React.FC<Props> = ({width, height}) => {
    const currentMonth = new Date().toLocaleString('default', { month: 'short' })
    const selectedFieldType = useTemplateStore(state => state.selectedFieldType)
    const isSelected = selectedFieldType === 'month'
    return (
        <div 
        className='month-icon' 
        style={{
            width, 
            height, 
            background: CONFIG.bgColor, 
            color: CONFIG.color,
            borderColor: isSelected ? CONFIG.color : 'transparent'
        }}
        >
            <p>{currentMonth}</p>
            <div className='month-icon__grid'>
               {Array.from({ length: 30 }, (_, i) => i + 1).map(day => <div key={day} style={{background: CONFIG.color}} className='month-icon__grid__item' />)}
            </div>
        </div>
    )
}