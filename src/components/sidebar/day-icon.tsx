import { FIELD_TYPE_CONFIG } from "@/types/planner";
import './day-icon.scss'
import { useTemplateStore } from "@/stores/template-store";

const CONFIG = FIELD_TYPE_CONFIG.day;


interface Props {
    width: number;
    height: number;
    showActiveStyle?: boolean;
}


export const DayIcon: React.FC<Props> = ({width, height, showActiveStyle = true}) => {
    const currentDay = new Date().getDate();
    const selectedFieldType = useTemplateStore(state => state.selectedFieldType)
    const isSelected = selectedFieldType === 'day'
    return (
        <div 
        className="day-icon" 
        style={{
            background: CONFIG.bgColor, 
            color: CONFIG.color, 
            borderColor: showActiveStyle && isSelected ? CONFIG.color : 'transparent',
            width, 
            height
        }}>
            <span className="day-icon__day" style={{borderColor: CONFIG.bgColor}}>{currentDay}</span>
        </div>
    )
}