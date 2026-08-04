import type { FieldType } from '../value-objects/field-style';
import type { TemplateType } from '../value-objects/planner-locale';

export const TEMPLATE_FIELD_TYPES: Record<TemplateType, FieldType[]> = {
  cover: [],
  'month-cover': ['year', 'month'],
  'monthly-calendar': ['year', 'month', 'day'],
  'weekly-calendar': ['year', 'month', 'day', 'startDay', 'endDay'],
  'daily-page': ['year', 'month', 'day'],
  extra: [],
};
