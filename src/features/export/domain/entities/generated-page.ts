import type { TemplateType } from '@/features/template/domain/value-objects/planner-locale';
import type { PaperSize } from '@/features/template/domain/services/paper-size';

/** Internal PDF GoTo link; x/y are the bottom-left corner in PDF points. */
export type PdfPageLink = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 1-based page number matching GeneratedPage.pageNumber */
  destPageNumber: number;
};

export interface GeneratedPage {
  imageData: string;
  width: number;
  height: number;
  paperSize?: PaperSize;
  pageNumber: number;
  type: TemplateType;
  /** Source TemplatePage.id used to regenerate link contexts */
  templatePageId?: string;
  month?: number;
  year?: number;
  /** 0-based week index within the month (generation loop), not ISO week */
  weekNumber?: number;
  /** ISO date (yyyy-MM-dd) of the first day of the weekly spread */
  weekStartISO?: string;
  day?: number;
  links?: PdfPageLink[];
  spreadId?: string;
  spreadFace?: 'left' | 'right';
  isBlank?: boolean;
}
