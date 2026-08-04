import { FIELD_TYPE_CONFIG } from "@/features/template";
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useTemplateStore } from "@/features/template/ui/stores/template-store";
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { DEFAULT_WEEK_STARTS_ON, getWeekDayAbbrevs } from '@/features/template/domain/services/locale-config';
import './end-week-day-icon.scss'

const CONFIG = FIELD_TYPE_CONFIG.endDay;


interface Props {
    width: number;
    height: number;
    showActiveStyle?: boolean;
}


export const EndWeekDayIcon: React.FC<Props> = ({width, height, showActiveStyle = true}) => {
    const selectedFieldType = useEditorStore(state => state.selectedFieldType)
    const template = useCurrentTemplate();
    const weekStartsOn = template?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;
    const locale = template?.locale ?? 'es';
    const { end } = getWeekDayAbbrevs(weekStartsOn, locale);
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
            <div className="end-week-day-icon__day" style={{borderColor: CONFIG.bgColor}}>{end}</div>
            <div className="end-week-day-icon__boxes">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((day, index) => <div key={day} style={{background:index === 6 ? CONFIG.color : 'white'}} className='end-week-day-icon__boxes__box' />)}
            </div>
        </div>
    )
}
