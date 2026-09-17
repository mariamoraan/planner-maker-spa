import type { PlannerLocale, WeekStartsOn } from '../value-objects/planner-locale';
import type { FontId } from '../value-objects/field-style';
import type { PaperSize } from '../services/paper-size';
import type { TemplatePage } from './template-page';

export interface Template {
  id: string;
  name: string;
  description?: string;
  images: TemplatePage[];
  paperSize?: PaperSize;
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  locale?: PlannerLocale;
  weekStartsOn?: WeekStartsOn;
  /** General typography for dynamic blocks; per-block style.fontId overrides. */
  defaultFontId?: FontId;
  /** Recently used custom hex colors for this planner (most recent first, max 20). */
  customColors?: string[];
}
