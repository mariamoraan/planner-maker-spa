// Core types for the Visual Planner Template Generator

export type FieldType = 'year' | 'month' | 'day';

export type TemplateType = 
  | 'cover' 
  | 'month-cover' 
  | 'monthly-calendar' 
  | 'weekly-calendar' 
  | 'extra';

export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fieldType: FieldType;
}

export interface TemplateImage {
  id: string;
  name: string;
  type: TemplateType;
  imageData: string; // Base64 encoded image
  width: number;
  height: number;
  rectangles: Rectangle[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  images: TemplateImage[];
  createdAt: Date;
  updatedAt: Date;
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
    bgColor: 'hsla(258, 90%, 66%, 0.3)',
    description: 'Displays the year (e.g., 2024)',
  },
  month: {
    label: 'Month',
    color: 'hsl(168, 76%, 42%)',
    bgColor: 'hsla(168, 76%, 42%, 0.3)',
    description: 'Displays the month name (e.g., January)',
  },
  day: {
    label: 'Day',
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'hsla(25, 95%, 53%, 0.3)',
    description: 'Displays day numbers or date ranges',
  },
};

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
  extra: {
    label: 'Extra Page',
    description: 'Notes, goals, or custom pages',
  },
};
