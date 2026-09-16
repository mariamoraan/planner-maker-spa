import type { FieldType } from '../value-objects/field-style';
import type { TemplateType } from '../value-objects/planner-locale';

export const TEMPLATE_FIELD_TYPES: Record<TemplateType, FieldType[]> = {
  cover: ['startDay', 'endDay', 'weekNumber', 'composite'],
  'month-cover': ['year', 'month', 'startDay', 'endDay', 'composite'],
  'monthly-calendar': ['year', 'month', 'day', 'startDay', 'endDay', 'composite'],
  'weekly-calendar': ['year', 'month', 'day', 'startDay', 'endDay', 'weekNumber', 'composite'],
  'daily-page': ['year', 'month', 'day', 'startDay', 'endDay', 'weekNumber', 'composite'],
  extra: ['startDay', 'endDay', 'weekNumber', 'composite'],
};
