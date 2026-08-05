import type { TemplateType } from '@/features/template/domain/value-objects/planner-locale';
import type { PaperSize } from '@/features/template/domain/services/paper-size';

export interface GeneratedPage {
  imageData: string;
  width: number;
  height: number;
  paperSize?: PaperSize;
  pageNumber: number;
  type: TemplateType;
  month?: number;
  year?: number;
  weekNumber?: number;
  day?: number;
}
