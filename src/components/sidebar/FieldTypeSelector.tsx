import React, { useEffect } from 'react';
import { Type, Calendar1, CalendarClock, CalendarDays } from 'lucide-react';
import type { FieldType } from '@/types/planner';
import { FIELD_TYPE_CONFIG, TEMPLATE_FIELD_TYPES } from '@/types/planner';
import { useTemplateStore } from '@/stores/template-store';
import './field-type-selector.scss'
import clsx from 'clsx';

interface FieldTypeSelectorProps {
  selectedType: FieldType;
  onTypeChange: (type?: FieldType) => void;
}

const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  year: <div className="field-type-selector__button__icon">Y</div>,
  month:  <div className="field-type-selector__button__icon">M</div>,
  day:  <div className="field-type-selector__button__icon">D</div>,
  startDay: <div className="field-type-selector__button__icon">S</div>,
  endDay: <div className="field-type-selector__button__icon">E</div>,
};

export const FieldTypeSelector: React.FC<FieldTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
}) => {
  const {getCurrentImage} = useTemplateStore()
  const currentImage = getCurrentImage()

  useEffect(() => {
    const availableFieldTypes = (Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).filter(type => TEMPLATE_FIELD_TYPES[currentImage.type].includes(type))
    if(!selectedType) {
       onTypeChange(availableFieldTypes[0]);
       return
    }
    const includesCurrentFieldType = availableFieldTypes.includes(selectedType);
    if(!includesCurrentFieldType) {
      onTypeChange(availableFieldTypes?.length ? availableFieldTypes[0] : undefined)
    }
  }, [currentImage.type, selectedType])
  
  return (
    <div className="field-type-selector">
        {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[])
        .filter(type => TEMPLATE_FIELD_TYPES[currentImage.type].includes(type))
        .map(type => {
          const config = FIELD_TYPE_CONFIG[type];
          const isSelected = selectedType === type;
          
          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className='field-type-selector__button'
            >
              <div 
                 className='field-type-selector__button__icon-wrapper'
                style={{ 
                  backgroundColor: config.bgColor,
                  border: `2px solid ${config.color}`,
                  color: config.color
                }}
              >
                {FIELD_ICONS[type]}
              </div>
              <div style={{background: config.color}} className={clsx('field-type-selector__button__indicator', {'field-type-selector__button__indicator--visible': isSelected})} />
            </button>
          );
        })}
      </div>
  );
};
