import type { TemplateType } from '@/features/template/domain/value-objects/planner-locale';

export interface GeneratedPage {
  imageData: string;
  width: number;
  height: number;
  pageNumber: number;
  type: TemplateType;
  month?: number;
  year?: number;
  weekNumber?: number;
  day?: number;
}
