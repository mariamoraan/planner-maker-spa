import './field-type-selector.scss'

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldType } from '@/features/template';
import { FIELD_TYPE_CONFIG, TEMPLATE_FIELD_TYPES, DEFAULT_COMPOSITE_PARTS } from '@/features/template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { getGridGroupForSelection } from '@/features/editor/domain/services/grid-group';
import { YearIcon } from './year-icon';
import { MonthIcon } from './month-icon';
import { DayIcon } from './day-icon';
import { StartWeekDayIcon } from './start-week-day-icon';
import { EndWeekDayIcon } from './end-week-day-icon';
import { WeekNumberIcon } from './week-number-icon';
import { CompositeIcon } from './composite-icon';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { getDefaultFieldStyle, getDefaultFormatVariant } from '@/features/editor/domain/services/field-style-config';
import { getDefaultBlockSize } from '@/features/editor/domain/services/default-block-size';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import { GridIcon } from '@/core/icons';

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
    case 'weekNumber':
      return <WeekNumberIcon {...iconProps} />;
    case 'composite':
      return <CompositeIcon {...iconProps} />;
  }
}

export const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  year: getFieldIcon('year'),
  month: getFieldIcon('month'),
  day: getFieldIcon('day'),
  startDay: getFieldIcon('startDay'),
  endDay: getFieldIcon('endDay'),
  weekNumber: getFieldIcon('weekNumber'),
  composite: getFieldIcon('composite'),
};

export const FieldTypeSelector = () => {
  const { t } = useTranslation();
  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const setSelectedFieldType = useEditorStore(state => state.setSelectedFieldType);
  const { addArea } = useManageAreas();
  const { createDefaultGrid } = useGridGroupOps();
  const currentImage = useCurrentImage();

  if (!currentImage) return null;

  const availableTypes = (Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).filter(type =>
    TEMPLATE_FIELD_TYPES[currentImage.type].includes(type),
  );

  if (availableTypes.length === 0) {
    return (
      <div className="field-type-selector__no-available-dynamic-areas">
        <p className="field-type-selector__no-available-dynamic-areas__title">
          No available dynamic areas for this page type
        </p>
      </div>
    );
  }

  const selectedRects = currentImage.rectangles.filter(rect =>
    selectedRectangleIds.includes(rect.id),
  );
  const isGridSelected =
    getGridGroupForSelection(selectedRectangleIds, currentImage.gridGroups) !== null;
  const highlightedType =
    !isGridSelected &&
    selectedRects.length > 0 &&
    selectedRects.every(rect => rect.fieldType === selectedRects[0].fieldType)
      ? selectedRects[0].fieldType
      : undefined;

  const handleSelectType = (type: FieldType) => {
    setSelectedFieldType(type);

    const { width, height } = getDefaultBlockSize(type, currentImage.width, currentImage.height);

    addArea({
      x: currentImage.width / 2 - width / 2,
      y: currentImage.height / 2 - height / 2,
      width,
      height,
      fieldType: type,
      order: currentImage.rectangles.length,
      formatVariant: getDefaultFormatVariant(type),
      style: getDefaultFieldStyle(),
      ...(type === 'composite' ? { compositeParts: [...DEFAULT_COMPOSITE_PARTS] } : {}),
    });
  };

  const handleAddGrid = () => {
    createDefaultGrid();
  };

  return (
    <div className="field-type-selector">
      <div className="field-type-selector__types">
        {availableTypes.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => handleSelectType(type)}
            className={`field-type-selector__button${highlightedType === type ? ' field-type-selector__button--active' : ''}`}
            title={FIELD_TYPE_CONFIG[type].label}
          >
            <div className="field-type-selector__button__icon-wrapper">{FIELD_ICONS[type]}</div>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`field-type-selector__grid-btn${isGridSelected ? ' field-type-selector__grid-btn--active' : ''}`}
        onClick={handleAddGrid}
        aria-label={t('editor.gridAddGrid')}
        title={t('editor.gridAddGrid')}
      >
         <div className="field-type-selector__grid-btn__icon-wrapper"><GridIcon size={30} color='#7af87a' /></div>
      </button>
    </div>
  );
};
