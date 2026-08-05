import type { Template, GeneratedPage } from '@/features/template';
import {
  inferTemplatePaperSize,
  paperSizeToPixels,
  type PaperSize,
} from '@/features/template/domain/services/paper-size';
import {
  getFieldValue,
  loadImage,
  WeekData,
  getMonthsBetween,
  getDaysOfMonth,
  renderFieldOnCanvas,
} from '@/features/editor/domain/services/planner-utils';
import { resolveLocale, DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import type { WorkerResponse } from '@/features/export/infrastructure/workers/pdf.worker';

const PAGES_WEIGHT = 0.85;
const PDF_WEIGHT = 0.15;

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function resolveTemplateWeekStartsOn(template: Template) {
  return template.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;
}

export function buildExportKey(
  templateId: string,
  startDate: Date,
  endDate: Date,
  updatedAt: Date
): string {
  return `${templateId}:${startDate.toISOString()}:${endDate.toISOString()}:${updatedAt.getTime()}`;
}

export function estimatePageCount(
  template: Template,
  startDate: Date,
  endDate: Date
): number {
  let total = 0;
  const months = getMonthsBetween({
    startDate,
    endDate,
    weekStartsOn: resolveTemplateWeekStartsOn(template),
  });
  const coverImages = template.images.filter(img => img.type === 'cover');
  const weeklyCalendars = template.images.filter(img => img.type === 'weekly-calendar');
  const dailyPageTemplates = template.images.filter(img => img.type === 'daily-page');

  total += coverImages.length;

  for (const month of months) {
    const monthCovers = template.images.filter(img => img.type === 'month-cover');
    const monthlyCalendars = template.images.filter(img => img.type === 'monthly-calendar');
    const daysInMonth = getDaysOfMonth({ year: month.year, month: month.month });

    total += monthCovers.length;
    total += monthlyCalendars.length;

    if (weeklyCalendars.length > 0 && dailyPageTemplates.length > 0) {
      for (const week of month.weeks) {
        total += weeklyCalendars.length;
        const monthDaysInWeek = week.days.filter(d => d.getMonth() === month.month).length;
        total += dailyPageTemplates.length * monthDaysInWeek;
      }
    } else {
      if (weeklyCalendars.length > 0) {
        total += weeklyCalendars.length * month.weeks.length;
      }
      if (dailyPageTemplates.length > 0) {
        total += dailyPageTemplates.length * daysInMonth.length;
      }
    }
  }

  total += template.images.filter(img => img.type === 'extra').length;
  return total;
}

async function generatePage(
  templateImage: Template['images'][0],
  context: {
    year?: number;
    month?: number;
    week?: WeekData;
    days?: Date[];
    date?: Date;
  },
  plannerLocale: Template['locale'] = 'es',
  paperSize?: PaperSize,
): Promise<{ imageData: string; width: number; height: number; paperSize?: PaperSize }> {
  const img = await loadImage(templateImage.src);

  const outputSize = paperSize
    ? paperSizeToPixels(paperSize)
    : { width: templateImage.width, height: templateImage.height };
  const scaleX = outputSize.width / templateImage.width;
  const scaleY = outputSize.height / templateImage.height;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize.width;
  canvas.height = outputSize.height;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, outputSize.width, outputSize.height);

  const dateLocale = resolveLocale(plannerLocale ?? 'es');

  for (const rect of templateImage.rectangles) {
    const { fieldValue, fieldColor } = getFieldValue({
      fieldType: rect.fieldType,
      context,
      templateImage,
      rectangle: rect,
      fillIncompleteWeeks: true,
      fillIncompleteMonths: true,
      locale: dateLocale,
    });

    if (fieldValue) {
      await renderFieldOnCanvas(ctx, rect, fieldValue, fieldColor, scaleX, scaleY);
    }
  }

  return {
    imageData: canvas.toDataURL('image/png'),
    width: outputSize.width,
    height: outputSize.height,
    paperSize,
  };
}

export async function generatePlannerPages(
  template: Template,
  startDate: Date,
  endDate: Date,
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedPage[]> {
  const pages: GeneratedPage[] = [];
  const plannerLocale = template.locale ?? 'es';
  const weekStartsOn = resolveTemplateWeekStartsOn(template);
  const months = getMonthsBetween({ startDate, endDate, weekStartsOn });
  const totalPages = Math.max(estimatePageCount(template, startDate, endDate), 1);

  const reportProgress = () => {
    onProgress?.(pages.length, totalPages);
  };

  onProgress?.(0, totalPages);

  const coverImages = template.images.filter(img => img.type === 'cover');
  const weeklyCalendars = template.images.filter(img => img.type === 'weekly-calendar');
  const dailyPageTemplates = template.images.filter(img => img.type === 'daily-page');
  const exportPaperSize = template.paperSize ?? inferTemplatePaperSize(template);

  for (const coverImage of coverImages) {
    const page = await generatePage(coverImage, {}, plannerLocale, exportPaperSize);
    pages.push({ ...page, pageNumber: pages.length + 1, type: 'cover' });
    reportProgress();
  }

  for (const month of months) {
    const monthCovers = template.images.filter(img => img.type === 'month-cover');
    for (const monthCover of monthCovers) {
      const page = await generatePage(monthCover, {
        year: month.year,
        month: month.month,
        days: month.days,
      }, plannerLocale, exportPaperSize);
      pages.push({ ...page, pageNumber: pages.length + 1, type: 'month-cover' });
      reportProgress();
    }

    const monthlyCalendars = template.images.filter(img => img.type === 'monthly-calendar');
    for (const monthlyCalendar of monthlyCalendars) {
      const page = await generatePage(monthlyCalendar, {
        year: month.year,
        month: month.month,
        days: month.days,
      }, plannerLocale, exportPaperSize);
      pages.push({ ...page, pageNumber: pages.length + 1, type: 'monthly-calendar' });
      reportProgress();
    }

    const daysInMonth = getDaysOfMonth({ year: month.year, month: month.month });

    const pushDailyPage = async (
      dailyTemplate: Template['images'][0],
      date: Date
    ) => {
      const page = await generatePage(dailyTemplate, {
        year: date.getFullYear(),
        month: date.getMonth(),
        date,
      }, plannerLocale, exportPaperSize);
      pages.push({
        ...page,
        pageNumber: pages.length + 1,
        type: 'daily-page',
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      });
      reportProgress();
    };

    if (weeklyCalendars.length > 0 && dailyPageTemplates.length > 0) {
      let weekIndex = 0;
      for (const week of month.weeks) {
        for (const weeklyCalendar of weeklyCalendars) {
          const page = await generatePage(weeklyCalendar, {
            year: month.year,
            month: month.month,
            week,
          }, plannerLocale, exportPaperSize);
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'weekly-calendar',
            month: month.month,
            year: month.year,
            weekNumber: weekIndex,
          });
          reportProgress();
        }

        const monthDaysInWeek = week.days.filter(d => d.getMonth() === month.month);
        for (const date of monthDaysInWeek) {
          for (const dailyTemplate of dailyPageTemplates) {
            await pushDailyPage(dailyTemplate, date);
          }
        }

        weekIndex++;
      }
    } else {
      for (const weeklyCalendar of weeklyCalendars) {
        let i = 0;
        for (const week of month.weeks) {
          const page = await generatePage(weeklyCalendar, {
            year: month.year,
            month: month.month,
            week,
          }, plannerLocale, exportPaperSize);
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'weekly-calendar',
            month: month.month,
            year: month.year,
            weekNumber: i,
          });
          i++;
          reportProgress();
        }
      }

      for (const date of daysInMonth) {
        for (const dailyTemplate of dailyPageTemplates) {
          await pushDailyPage(dailyTemplate, date);
        }
      }
    }
  }

  const extraPages = template.images.filter(img => img.type === 'extra');
  for (const extra of extraPages) {
    const page = await generatePage(extra, {}, plannerLocale, exportPaperSize);
    pages.push({ ...page, pageNumber: pages.length + 1, type: 'extra' });
    reportProgress();
  }

  return pages;
}

export function buildPdfFromPages(
  pages: GeneratedPage[],
  onProgress?: (current: number, total: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../../infrastructure/workers/pdf.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.status === 'progress') {
        onProgress?.(e.data.current, e.data.total);
      } else if (e.data.status === 'success') {
        resolve(e.data.pdfBytes);
        worker.terminate();
      } else {
        reject(new Error(e.data.message));
        worker.terminate();
      }
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    worker.postMessage({ pages });
  });
}

export function triggerPdfDownload(pdfBytes: ArrayBuffer, fileName: string): string {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  return url;
}

export interface RunExportOptions {
  template: Template;
  startDate: Date;
  endDate: Date;
  cachedPages?: GeneratedPage[] | null;
  cachedKey?: string | null;
  onProgress: (progress: number, phase: 'pages' | 'pdf') => void;
}

export async function runExport({
  template,
  startDate,
  endDate,
  cachedPages,
  cachedKey,
  onProgress,
}: RunExportOptions): Promise<{ pdfBytes: ArrayBuffer; fileName: string; pages: GeneratedPage[] }> {
  const exportKey = buildExportKey(template.id, startDate, endDate, template.updatedAt);
  const fileName = `${template.name}.pdf`;

  let pages: GeneratedPage[];
  const exportPaperSize = template.paperSize ?? inferTemplatePaperSize(template);

  if (cachedPages && cachedPages.length > 0 && cachedKey === exportKey) {
    pages = cachedPages;
    onProgress(clampProgress(PAGES_WEIGHT * 100), 'pages');
  } else {
    pages = await generatePlannerPages(template, startDate, endDate, (current, total) => {
      const phaseProgress = total > 0 ? current / total : 1;
      onProgress(clampProgress(phaseProgress * PAGES_WEIGHT * 100), 'pages');
    });
  }

  const pagesForPdf = pages.map(page => ({
    ...page,
    paperSize: page.paperSize ?? exportPaperSize,
  }));

  const pdfBytes = await buildPdfFromPages(pagesForPdf, (current, total) => {
    const phaseProgress = total > 0 ? current / total : 1;
    onProgress(
      clampProgress(PAGES_WEIGHT * 100 + phaseProgress * PDF_WEIGHT * 100),
      'pdf'
    );
  });

  return { pdfBytes, fileName, pages: pagesForPdf };
}
