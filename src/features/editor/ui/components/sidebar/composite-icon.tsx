import { FIELD_TYPE_CONFIG } from '@/features/template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import './field-type-icon.scss';

const CONFIG = FIELD_TYPE_CONFIG.composite;

interface Props {
  width: number;
  height: number;
  showActiveStyle?: boolean;
}

export const CompositeIcon: React.FC<Props> = ({
  width,
  height,
  showActiveStyle = true,
}) => {
  const selectedFieldType = useEditorStore(state => state.selectedFieldType);
  const isSelected = selectedFieldType === 'composite';
  const day = new Date().getDate();

  return (
    <div
      className="field-type-icon field-type-icon--composite"
      style={{
        background: CONFIG.bgColor,
        color: CONFIG.color,
        width,
        height,
        borderColor: showActiveStyle && isSelected ? CONFIG.color : 'transparent',
      }}
    >
      <span>Aa</span>
      <span>{day}</span>
    </div>
  );
};
