import type { FieldType } from '../value-objects/field-style';
import type { TemplateType } from '../value-objects/planner-locale';

/** Editorial ink palette — clearer hue + contrast, still unified (not neon UI). */
export const FIELD_TYPE_CONFIG: Record<
  FieldType,
  {
    label: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  year: {
    label: 'Year',
    color: 'hsl(215, 48%, 44%)',
    bgColor: 'hsla(215, 48%, 44%, 0.14)',
    description: 'Displays the year (e.g., 2024)',
  },
  month: {
    label: 'Month',
    color: 'hsl(172, 42%, 36%)',
    bgColor: 'hsla(172, 42%, 36%, 0.14)',
    description: 'Displays the month name (e.g., January)',
  },
  day: {
    label: 'Day',
    color: 'hsl(18, 55%, 46%)',
    bgColor: 'hsla(18, 55%, 46%, 0.14)',
    description: 'Displays day numbers or date ranges',
  },
  startDay: {
    label: 'Start Day',
    color: 'hsl(40, 52%, 42%)',
    bgColor: 'hsla(40, 52%, 42%, 0.14)',
    description: 'Displays the start of the page date range',
  },
  endDay: {
    label: 'End Day',
    color: 'hsl(8, 58%, 46%)',
    bgColor: 'hsla(8, 58%, 46%, 0.14)',
    description: 'Displays the end of the page date range',
  },
  weekNumber: {
    label: 'Week',
    color: 'hsl(200, 48%, 42%)',
    bgColor: 'hsla(200, 48%, 42%, 0.14)',
    description: 'Displays the ISO week number',
  },
  composite: {
    label: 'Composite',
    color: 'hsl(272, 40%, 48%)',
    bgColor: 'hsla(272, 40%, 48%, 0.14)',
    description: 'Combines date parts into one block',
  },
};

export const TEMPLATE_TYPE_CONFIG: Record<
  TemplateType,
  {
    label: string;
    description: string;
  }
> = {
  cover: {
    label: 'Cover',
    description: 'Main planner cover page',
  },
  'yearly-calendar': {
    label: 'Yearly Calendar',
    description: 'Year overview with months',
  },
  'month-cover': {
    label: 'Month Cover',
    description: 'Monthly section divider',
  },
  'monthly-calendar': {
    label: 'Monthly Calendar',
    description: 'Full month calendar view',
  },
  'weekly-calendar': {
    label: 'Weekly Calendar',
    description: 'Week-by-week planning pages',
  },
  'daily-page': {
    label: 'Daily Page',
    description: 'Single-day planning pages',
  },
  extra: {
    label: 'Extra Page',
    description: 'Notes, goals, or custom pages',
  },
};
