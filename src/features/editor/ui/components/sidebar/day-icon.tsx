import { FIELD_TYPE_CONFIG } from "@/features/template";
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import './day-icon.scss'
import { useTemplateStore } from "@/features/template/ui/stores/template-store";

const CONFIG = FIELD_TYPE_CONFIG.day;


interface Props {
    width: number;
    height: number;
    showActiveStyle?: boolean;
}


export const DayIcon: React.FC<Props> = ({width, height, showActiveStyle = true}) => {
    const currentDay = new Date().getDate();
    const selectedFieldType = useEditorStore(state => state.selectedFieldType)
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