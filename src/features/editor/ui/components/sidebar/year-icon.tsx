import { FIELD_TYPE_CONFIG } from "@/features/template";
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import './year-icon.scss'
import { useTemplateStore } from "@/features/template/ui/stores/template-store";

const CONFIG = FIELD_TYPE_CONFIG.year;


interface Props {
    width: number;
    height: number;
    showActiveStyle?: boolean;
}


export const YearIcon: React.FC<Props> = ({width, height, showActiveStyle = true}) => {
    const currentYear = new Date().getFullYear();
    const selectedFieldType = useEditorStore(state => state.selectedFieldType)
    const isSelected = selectedFieldType === 'year'
    return (
        <div 
        className="year-icon" 
        style={{
            background: CONFIG.bgColor, 
            color: CONFIG.color, 
            width, 
            height,
            borderColor: showActiveStyle && isSelected ? CONFIG.color : 'transparent'
        }}>
            {currentYear}
        </div>
    )
}