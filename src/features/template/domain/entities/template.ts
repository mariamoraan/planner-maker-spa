import type { PlannerLocale, WeekStartsOn } from '../value-objects/planner-locale';
import type { TemplatePage } from './template-page';

export interface Template {
  id: string;
  name: string;
  description?: string;
  images: TemplatePage[];
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  locale?: PlannerLocale;
  weekStartsOn?: WeekStartsOn;
}
