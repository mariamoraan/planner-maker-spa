import { FIELD_TYPE_CONFIG } from '@/features/template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { getISOWeek } from 'date-fns';
import './field-type-icon.scss';

const CONFIG = FIELD_TYPE_CONFIG.weekNumber;

interface Props {
  width: number;
  height: number;
  showActiveStyle?: boolean;
}

export const WeekNumberIcon: React.FC<Props> = ({
  width,
  height,
  showActiveStyle = true,
}) => {
  const week = getISOWeek(new Date());
  const selectedFieldType = useEditorStore(state => state.selectedFieldType);
  const isSelected = selectedFieldType === 'weekNumber';

  return (
    <div
      className="field-type-icon"
      style={{
        background: CONFIG.bgColor,
        color: CONFIG.color,
        width,
        height,
        borderColor: showActiveStyle && isSelected ? CONFIG.color : 'transparent',
      }}
    >
      W{week}
    </div>
  );
};
