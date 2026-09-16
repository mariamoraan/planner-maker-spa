import type { FieldType } from '../value-objects/field-style';
import type { TemplateType } from '../value-objects/planner-locale';

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
    color: 'hsl(258, 90%, 66%)',
    bgColor: 'hsla(258, 90%, 66%, 0.2)',
    description: 'Displays the year (e.g., 2024)',
  },
  month: {
    label: 'Month',
    color: 'hsl(168, 76%, 42%)',
    bgColor: 'hsla(168, 76%, 42%, 0.2)',
    description: 'Displays the month name (e.g., January)',
  },
  day: {
    label: 'Day',
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'hsla(25, 95%, 53%, 0.2)',
    description: 'Displays day numbers or date ranges',
  },
  startDay: {
    label: 'Start Day',
    color: 'hsl(53, 95%, 45%)',
    bgColor: 'hsla(53, 95%, 53%, 0.2)',
    description: 'Displays the start of the page date range',
  },
  endDay: {
    label: 'End Day',
    color: 'hsl(13, 95%, 53%)',
    bgColor: 'hsla(13, 95%, 53%, 0.2)',
    description: 'Displays the end of the page date range',
  },
  weekNumber: {
    label: 'Week',
    color: 'hsl(200, 85%, 45%)',
    bgColor: 'hsla(200, 85%, 45%, 0.2)',
    description: 'Displays the ISO week number',
  },
  composite: {
    label: 'Composite',
    color: 'hsl(280, 70%, 55%)',
    bgColor: 'hsla(280, 70%, 55%, 0.2)',
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
