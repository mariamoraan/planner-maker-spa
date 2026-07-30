import { FIELD_TYPE_CONFIG } from "@/types/planner";
import { useTemplateStore } from "@/stores/template-store";
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { DEFAULT_WEEK_STARTS_ON, getWeekDayAbbrevs } from '@/lib/locale-config';
import './start-week-day-icon.scss'

const CONFIG = FIELD_TYPE_CONFIG.startDay;


interface Props {
    width: number;
    height: number;
    showActiveStyle?: boolean;
}


export const StartWeekDayIcon: React.FC<Props> = ({width, height, showActiveStyle = true}) => {
    const selectedFieldType = useTemplateStore(state => state.selectedFieldType)
    const template = useCurrentTemplate();
    const weekStartsOn = template?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;
    const locale = template?.locale ?? 'es';
    const { start } = getWeekDayAbbrevs(weekStartsOn, locale);
    const isSelected = selectedFieldType === 'startDay'
    return (
        <div 
        className="start-week-day-icon" 
        style={{
            background: CONFIG.bgColor, 
            color: CONFIG.color, 
            borderColor: showActiveStyle && isSelected ? CONFIG.color : 'transparent',
            width, 
            height
        }}>
            <div className="start-week-day-icon__day" style={{borderColor: CONFIG.bgColor}}>{start}</div>
            <div className="start-week-day-icon__boxes">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((day, index) => <div key={day} style={{background:index === 0 ? CONFIG.color : 'white'}} className='start-week-day-icon__boxes__box' />)}
            </div>
        </div>
    )
}
