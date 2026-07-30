import './field-type-selector.scss'

import React, { useEffect } from 'react';
import type { FieldType } from '@/types/planner';
import { FIELD_TYPE_CONFIG, TEMPLATE_FIELD_TYPES } from '@/types/planner';
import { useTemplateStore } from '@/stores/template-store';
import { YearIcon } from './year-icon';
import { MonthIcon } from './month-icon';
import { DayIcon } from './day-icon';
import { StartWeekDayIcon } from './start-week-day-icon';
import { EndWeekDayIcon } from './end-week-day-icon';
import { useManageAreas } from '@/hooks/use-manage-areas';
import { useCurrentImage } from '@/hooks/use-current-image';
import { getDefaultFieldStyle, getDefaultFormatVariant } from '@/lib/field-style-config';

const DEFAULT_ICON_SIZE = 50;

export function getFieldIcon(type: FieldType, size = DEFAULT_ICON_SIZE): React.ReactNode {
  const iconProps = { showActiveStyle: false as const, width: size, height: size };

  switch (type) {
    case 'year':
      return <YearIcon {...iconProps} />;
    case 'month':
      return <MonthIcon {...iconProps} />;
    case 'day':
      return <DayIcon {...iconProps} />;
    case 'startDay':
      return <StartWeekDayIcon {...iconProps} />;
    case 'endDay':
      return <EndWeekDayIcon {...iconProps} />;
  }
}

export const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  year: getFieldIcon('year'),
  month: getFieldIcon('month'),
  day: getFieldIcon('day'),
  startDay: getFieldIcon('startDay'),
  endDay: getFieldIcon('endDay'),
};

export const FieldTypeSelector = () => {
  
  const { selectedFieldType, setSelectedFieldType} = useTemplateStore()
  const {addArea} = useManageAreas();
  const currentImage = useCurrentImage()

  useEffect(() => {
    if (!currentImage) return;
    const availableFieldTypes = (Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).filter(type => TEMPLATE_FIELD_TYPES[currentImage.type].includes(type))
    if(!selectedFieldType) {
      setSelectedFieldType(availableFieldTypes[0]);
       return
    }
    const includesCurrentFieldType = availableFieldTypes.includes(selectedFieldType);
    if(!includesCurrentFieldType) {
      setSelectedFieldType(availableFieldTypes?.length ? availableFieldTypes[0] : undefined)
    }
  }, [currentImage, currentImage?.type, selectedFieldType, setSelectedFieldType])

  if (!currentImage) return null;

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
      formatVariant: getDefaultFormatVariant(type),
      style: getDefaultFieldStyle(),
    });
  };

  const hasAvailableDynamicAreas = (Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).filter(type => TEMPLATE_FIELD_TYPES[currentImage.type].includes(type)).length > 0

  if (!hasAvailableDynamicAreas) {
    return (
      <div className='field-type-selector__no-available-dynamic-areas'>
        <p className='field-type-selector__no-available-dynamic-areas__title'>No available dynamic areas for this page type</p>
      </div>
    );
  }

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
