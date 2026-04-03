import { FIELD_TYPE_CONFIG } from "@/types/planner";
import { useTemplateStore } from "@/stores/template-store";
import './end-week-day-icon.scss'

const CONFIG = FIELD_TYPE_CONFIG.endDay;


interface Props {
    width: number;
    height: number;
    showActiveStyle?: boolean;
}


export const EndWeekDayIcon: React.FC<Props> = ({width, height, showActiveStyle = true}) => {
    const selectedFieldType = useTemplateStore(state => state.selectedFieldType)
    const isSelected = selectedFieldType === 'endDay'
    return (
        <div 
        className="end-week-day-icon" 
        style={{
            background: CONFIG.bgColor, 
            color: CONFIG.color, 
            borderColor: showActiveStyle && isSelected ? CONFIG.color : 'transparent',
            width, 
            height
        }}>
            <div className="end-week-day-icon__day" style={{borderColor: CONFIG.bgColor}}>DOM</div>
            <div className="end-week-day-icon__boxes">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((day, index) => <div key={day} style={{background:index === 6 ? CONFIG.color : 'white'}} className='end-week-day-icon__boxes__box' />)}
            </div>
        </div>
    )
}