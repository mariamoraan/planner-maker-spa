import type { FieldType } from '../value-objects/field-style';
import type { TemplateType } from '../value-objects/planner-locale';

/** Modern editorial ink palette — muted hues, low-fill chrome. */
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
    color: 'hsl(215, 22%, 42%)',
    bgColor: 'hsla(215, 22%, 42%, 0.1)',
    description: 'Displays the year (e.g., 2024)',
  },
  month: {
    label: 'Month',
    color: 'hsl(175, 18%, 36%)',
    bgColor: 'hsla(175, 18%, 36%, 0.1)',
    description: 'Displays the month name (e.g., January)',
  },
  day: {
    label: 'Day',
    color: 'hsl(18, 28%, 44%)',
    bgColor: 'hsla(18, 28%, 44%, 0.1)',
    description: 'Displays day numbers or date ranges',
  },
  startDay: {
    label: 'Start Day',
    color: 'hsl(38, 24%, 42%)',
    bgColor: 'hsla(38, 24%, 42%, 0.1)',
    description: 'Displays the start of the page date range',
  },
  endDay: {
    label: 'End Day',
    color: 'hsl(8, 30%, 44%)',
    bgColor: 'hsla(8, 30%, 44%, 0.1)',
    description: 'Displays the end of the page date range',
  },
  weekNumber: {
    label: 'Week',
    color: 'hsl(205, 20%, 40%)',
    bgColor: 'hsla(205, 20%, 40%, 0.1)',
    description: 'Displays the ISO week number',
  },
  composite: {
    label: 'Composite',
    color: 'hsl(265, 16%, 44%)',
    bgColor: 'hsla(265, 16%, 44%, 0.1)',
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
