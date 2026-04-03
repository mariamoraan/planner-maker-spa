import React, { useEffect } from 'react';
import type { FieldType } from '@/types/planner';
import { FIELD_TYPE_CONFIG, TEMPLATE_FIELD_TYPES } from '@/types/planner';
import { useTemplateStore } from '@/stores/template-store';
import './field-type-selector.scss'
import { YearIcon } from './year-icon';
import { MonthIcon } from './month-icon';
import { DayIcon } from './day-icon';
import { StartWeekDayIcon } from './start-week-day-icon';
import { EndWeekDayIcon } from './end-week-day-icon';
import { useManageAreas } from '@/hooks/use-manage-areas';

const ICON_HEIGHT = 50;
const ICON_WIDTH = 50;

export const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  year: <YearIcon showActiveStyle={false} width={ICON_WIDTH} height={ICON_HEIGHT} />,
  month:  <MonthIcon showActiveStyle={false} width={ICON_WIDTH} height={ICON_HEIGHT} />,
  day:  <DayIcon showActiveStyle={false} width={ICON_WIDTH} height={ICON_HEIGHT} />,
  startDay: <StartWeekDayIcon showActiveStyle={false} width={ICON_WIDTH} height={ICON_HEIGHT} />,
  endDay: <EndWeekDayIcon showActiveStyle={false} width={ICON_WIDTH} height={ICON_HEIGHT} />,
};

export const FieldTypeSelector = () => {
  
  const {getCurrentImage, selectedFieldType, setSelectedFieldType} = useTemplateStore()
  const {addArea} = useManageAreas();
  const currentImage = getCurrentImage()

  useEffect(() => {
    const availableFieldTypes = (Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).filter(type => TEMPLATE_FIELD_TYPES[currentImage.type].includes(type))
    if(!selectedFieldType) {
      setSelectedFieldType(availableFieldTypes[0]);
       return
    }
    const includesCurrentFieldType = availableFieldTypes.includes(selectedFieldType);
    if(!includesCurrentFieldType) {
      setSelectedFieldType(availableFieldTypes?.length ? availableFieldTypes[0] : undefined)
    }
  }, [currentImage.type, selectedFieldType])

  const handleSelectType = (type: FieldType) => {
    setSelectedFieldType(type);
  
    const DEFAULT_WIDTH = 150;
    const DEFAULT_HEIGHT = 150;
  
    addArea({
      x: currentImage.width / 2 - DEFAULT_WIDTH / 2,
      y: currentImage.height / 2 - DEFAULT_HEIGHT / 2,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      fieldType: type,
      order: currentImage.rectangles.length,
    });
  };
  
  return (
    <div className="field-type-selector">
         {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[])
          .filter(type => TEMPLATE_FIELD_TYPES[currentImage.type].includes(type))
          .map(type => {
            return (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className='field-type-selector__button'
              >
                <div 
                  className='field-type-selector__button__icon-wrapper'
                >
                  {FIELD_ICONS[type]}
                </div>
              </button>
            );
          })}
      </div>
  );
};
