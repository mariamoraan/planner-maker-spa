// Core types for the Visual Planner Template Generator

export type FieldType = 'year' | 'month' | 'day' | 'startDay' | 'endDay';

export type YearFormatVariant = 'YYYY' | 'YY';
export type MonthFormatVariant = 'numeric' | 'name';
export type DayFormatVariant = 'numeric' | 'weekdayName';

export type FormatVariant =
  | YearFormatVariant
  | MonthFormatVariant
  | DayFormatVariant;

export type FontId = 'gloria' | 'great-vibes' | 'lato';

export type TextCase = 'default' | 'uppercase' | 'lowercase' | 'capitalize';

export interface FieldStyle {
  color: string;
  fontId: FontId;
  bold: boolean;
  italic: boolean;
  textCase: TextCase;
}

export type TemplateType = 
  | 'cover' 
  | 'month-cover' 
  | 'monthly-calendar' 
  | 'weekly-calendar' 
  | 'daily-page'
  | 'extra';

export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fieldType: FieldType;
  order: number;
  formatVariant?: FormatVariant;
  style?: FieldStyle;
}

import type { ImageRef } from '@/infrastructure/ports/image-asset.port';

export interface TemplateImage {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  rectangles: Rectangle[];
  createdAt: Date;
  updatedAt: Date;
  src: string;
  imageRef?: ImageRef;
  missingLocalAsset?: boolean;
}

export type PlannerLocale = 'en' | 'es';

export type WeekStartsOn = 'monday' | 'sunday';

export interface Template {
  id: string;
  name: string;
  description?: string;
  images: TemplateImage[];
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  locale?: PlannerLocale;
  weekStartsOn?: WeekStartsOn;
}

export interface PlannerConfig {
  templateId: string;
  startDate: Date;
  endDate: Date;
  title?: string;
}

export interface GeneratedPage {
  imageData: string;
  pageNumber: number;
  type: TemplateType;
  month?: number;
  year?: number;
  weekNumber?: number;
  day?: number;
}

// Field type configuration for rendering
export const FIELD_TYPE_CONFIG: Record<FieldType, { 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
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
    description: 'Displays start day number',
  },
  endDay: {
    label: 'End Day',
    color: 'hsl(13, 95%, 53%)',
    bgColor: 'hsla(13, 95%, 53%, 0.2)',
    description: 'Displays end day number',
  }
};

export const TEMPLATE_FIELD_TYPES: Record<TemplateType, FieldType[]> = {
  'cover': [],
  'month-cover': ['year', 'month'],
  'monthly-calendar': ['year', 'month', 'day'],
  'weekly-calendar': ['year', 'month', 'day', 'startDay', 'endDay'],
  'daily-page': ['year', 'month', 'day'],
  'extra': [],
}

export const TEMPLATE_TYPE_CONFIG: Record<TemplateType, {
  label: string;
  description: string;
}> = {
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
    description: 'Single-day planning page',
  },
  extra: {
    label: 'Extra Page',
    description: 'Notes, goals, or custom pages',
  },
};
