import { FIELD_TYPE_CONFIG } from "@/types/planner";
import './year-icon.scss'
import { useTemplateStore } from "@/stores/template-store";

const CONFIG = FIELD_TYPE_CONFIG.year;


interface Props {
    width: number;
    height: number;
}


export const YearIcon: React.FC<Props> = ({width, height}) => {
    const currentYear = new Date().getFullYear();
    const selectedFieldType = useTemplateStore(state => state.selectedFieldType)
    const isSelected = selectedFieldType === 'year'
    return (
        <div 
        className="year-icon" 
        style={{
            background: CONFIG.bgColor, 
            color: CONFIG.color, 
            width, 
            height,
            borderColor: isSelected ? CONFIG.color : 'transparent'
        }}>
            {currentYear}
        </div>
    )
}