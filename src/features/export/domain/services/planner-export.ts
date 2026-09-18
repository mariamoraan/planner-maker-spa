import type { Template } from '@/features/template';
import type { GeneratedPage } from '@/features/export/domain/entities/generated-page';
import {
  inferTemplatePaperSize,
  paperSizeToPixels,
  type PaperSize,
} from '@/features/template/domain/services/paper-size';
import {
  getFieldValue,
  loadImage,
  getMonthsBetween,
  getDaysOfMonth,
  renderFieldOnCanvas,
  type FieldValueContext,
} from '@/features/editor/domain/services/planner-utils';
import { resolveWorldRect } from '@/features/editor/domain/services/block-geometry';
import { resolveLocale, DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import type { WeekStartsOn } from '@/features/template';
import PdfWorker from '@/features/export/infrastructure/workers/pdf.worker?worker';
import type { WorkerResponse } from '@/features/export/infrastructure/workers/pdf.worker';
import { assemblePdfFromPages } from '@/features/export/domain/services/assemble-pdf';
import {
  attachPdfLinks,
  toWeekStartISO,
} from '@/features/export/domain/services/pdf-page-links';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';

const PAGES_WEIGHT = 0.85;
const PDF_WEIGHT = 0.15;

async function waitForCustomFontsReady(timeoutMs = 15000): Promise<void> {
  const started = Date.now();
  while (useFontLibraryStore.getState().isRegistering) {
    if (Date.now() - started > timeoutMs) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

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
  updatedAt: Date,
  includeInternalLinks = true,
): string {
  return `${templateId}:${startDate.toISOString()}:${endDate.toISOString()}:${updatedAt.getTime()}:links=${includeInternalLinks ? 1 : 0}`;
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
  context: FieldValueContext,
  plannerLocale: Template['locale'] = 'es',
  paperSize?: PaperSize,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
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
      weekStartsOn,
    });

    if (fieldValue) {
      const world = resolveWorldRect(rect, templateImage.gridGroups);
      await renderFieldOnCanvas(
        ctx,
        { ...rect, x: world.x, y: world.y, rotation: world.rotation },
        fieldValue,
        fieldColor,
        scaleX,
        scaleY,
      );
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
  await waitForCustomFontsReady();

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
  const plannerRange = { plannerStart: startDate, plannerEnd: endDate };

  for (const coverImage of coverImages) {
    const page = await generatePage(
      coverImage,
      plannerRange,
      plannerLocale,
      exportPaperSize,
      weekStartsOn,
    );
    pages.push({
      ...page,
      pageNumber: pages.length + 1,
      type: 'cover',
      templatePageId: coverImage.id,
    });
    reportProgress();
  }

  for (const month of months) {
    const monthCovers = template.images.filter(img => img.type === 'month-cover');
    for (const monthCover of monthCovers) {
      const page = await generatePage(monthCover, {
        year: month.year,
        month: month.month,
        days: month.days,
        ...plannerRange,
      }, plannerLocale, exportPaperSize, weekStartsOn);
      pages.push({
        ...page,
        pageNumber: pages.length + 1,
        type: 'month-cover',
        templatePageId: monthCover.id,
        year: month.year,
        month: month.month,
      });
      reportProgress();
    }

    const monthlyCalendars = template.images.filter(img => img.type === 'monthly-calendar');
    for (const monthlyCalendar of monthlyCalendars) {
      const page = await generatePage(monthlyCalendar, {
        year: month.year,
        month: month.month,
        days: month.days,
        ...plannerRange,
      }, plannerLocale, exportPaperSize, weekStartsOn);
      pages.push({
        ...page,
        pageNumber: pages.length + 1,
        type: 'monthly-calendar',
        templatePageId: monthlyCalendar.id,
        year: month.year,
        month: month.month,
      });
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
        ...plannerRange,
      }, plannerLocale, exportPaperSize, weekStartsOn);
      pages.push({
        ...page,
        pageNumber: pages.length + 1,
        type: 'daily-page',
        templatePageId: dailyTemplate.id,
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      });
      reportProgress();
    };

    if (weeklyCalendars.length > 0 && dailyPageTemplates.length > 0) {
      let weekIndex = 0;
      for (const week of month.weeks) {
        const weekStartISO = week.days[0] ? toWeekStartISO(week.days[0]) : undefined;
        for (const weeklyCalendar of weeklyCalendars) {
          const page = await generatePage(weeklyCalendar, {
            year: month.year,
            month: month.month,
            week,
            ...plannerRange,
          }, plannerLocale, exportPaperSize, weekStartsOn);
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'weekly-calendar',
            templatePageId: weeklyCalendar.id,
            month: month.month,
            year: month.year,
            weekNumber: weekIndex,
            weekStartISO,
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
            ...plannerRange,
          }, plannerLocale, exportPaperSize, weekStartsOn);
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'weekly-calendar',
            templatePageId: weeklyCalendar.id,
            month: month.month,
            year: month.year,
            weekNumber: i,
            weekStartISO: week.days[0] ? toWeekStartISO(week.days[0]) : undefined,
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
    const page = await generatePage(
      extra,
      plannerRange,
      plannerLocale,
      exportPaperSize,
      weekStartsOn,
    );
    pages.push({
      ...page,
      pageNumber: pages.length + 1,
      type: 'extra',
      templatePageId: extra.id,
    });
    reportProgress();
  }

  return pages;
}

function buildPdfOnMainThread(
  pages: GeneratedPage[],
  onProgress?: (current: number, total: number) => void,
): Promise<ArrayBuffer> {
  return assemblePdfFromPages(pages, onProgress);
}

export function buildPdfFromPages(
  pages: GeneratedPage[],
  onProgress?: (current: number, total: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let worker: Worker | undefined;

    const settleWithMainThread = () => {
      if (settled) return;
      settled = true;
      try {
        worker?.terminate();
      } catch {
        /* ignore */
      }
      buildPdfOnMainThread(pages, onProgress).then(resolve, reject);
    };

    try {
      worker = new PdfWorker();
    } catch {
      settleWithMainThread();
      return;
    }

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.status === 'progress') {
        onProgress?.(e.data.current, e.data.total);
      } else if (e.data.status === 'success') {
        if (settled) return;
        settled = true;
        resolve(e.data.pdfBytes);
        worker?.terminate();
      } else {
        settleWithMainThread();
      }
    };

    worker.onmessageerror = () => {
      settleWithMainThread();
    };

    worker.onerror = () => {
      settleWithMainThread();
    };

    try {
      worker.postMessage({ pages });
    } catch {
      settleWithMainThread();
    }
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
  includeInternalLinks?: boolean;
  onProgress: (progress: number, phase: 'pages' | 'pdf') => void;
}

export async function runExport({
  template,
  startDate,
  endDate,
  cachedPages,
  cachedKey,
  includeInternalLinks = true,
  onProgress,
}: RunExportOptions): Promise<{ pdfBytes: ArrayBuffer; fileName: string; pages: GeneratedPage[] }> {
  const exportKey = buildExportKey(
    template.id,
    startDate,
    endDate,
    template.updatedAt,
    includeInternalLinks,
  );
  const fileName = `${template.name}.pdf`;

  let pages: GeneratedPage[];
  const exportPaperSize = template.paperSize ?? inferTemplatePaperSize(template);
  const weekStartsOn = resolveTemplateWeekStartsOn(template);

  if (cachedPages && cachedPages.length > 0 && cachedKey === exportKey) {
    pages = cachedPages;
    onProgress(clampProgress(PAGES_WEIGHT * 100), 'pages');
  } else {
    pages = await generatePlannerPages(template, startDate, endDate, (current, total) => {
      const phaseProgress = total > 0 ? current / total : 1;
      onProgress(clampProgress(phaseProgress * PAGES_WEIGHT * 100), 'pages');
    });
    pages = attachPdfLinks(template, pages, {
      startDate,
      endDate,
      enabled: includeInternalLinks,
      weekStartsOn,
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
