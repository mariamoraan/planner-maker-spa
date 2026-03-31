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

const ICON_HEIGHT = 50;
const ICON_WIDTH = 50;

const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  year: <YearIcon width={ICON_WIDTH} height={ICON_HEIGHT} />,
  month:  <MonthIcon width={ICON_WIDTH} height={ICON_HEIGHT} />,
  day:  <DayIcon width={ICON_WIDTH} height={ICON_HEIGHT} />,
  startDay: <StartWeekDayIcon width={ICON_WIDTH} height={ICON_HEIGHT} />,
  endDay: <EndWeekDayIcon width={ICON_WIDTH} height={ICON_HEIGHT} />,
};

export const FieldTypeSelector = () => {
  
  const {getCurrentImage, selectedFieldType, setSelectedFieldType} = useTemplateStore()
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
  
  return (
    <div className="field-type-selector">
         {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[])
          .filter(type => TEMPLATE_FIELD_TYPES[currentImage.type].includes(type))
          .map(type => {
            return (
              <button
                key={type}
                onClick={() => setSelectedFieldType(type)}
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
