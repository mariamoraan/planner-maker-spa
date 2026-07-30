import type { Template, GeneratedPage } from '@/types/planner';
import {
  getFieldValue,
  loadImage,
  WeekData,
  getMonthsBetween,
  getDaysOfMonth,
  renderFieldOnCanvas,
} from '@/lib/planner-utils';
import { resolveLocale } from '@/lib/locale-config';
import type { WorkerResponse } from '@/workers/pdf.worker';

const PAGES_WEIGHT = 0.85;
const PDF_WEIGHT = 0.15;

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
  const months = getMonthsBetween({ startDate, endDate });
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
  plannerLocale: Template['locale'] = 'es'
): Promise<{ imageData: string }> {
  const img = await loadImage(templateImage.src);

  const canvas = document.createElement('canvas');
  canvas.width = templateImage.width;
  canvas.height = templateImage.height;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);

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
      await renderFieldOnCanvas(ctx, rect, fieldValue, fieldColor);
    }
  }

  return {
    imageData: canvas.toDataURL('image/png'),
  };
}

function countGenerationSteps(
  template: Template,
  startDate: Date,
  endDate: Date
): number {
  let totalSteps = 0;
  const months = getMonthsBetween({ startDate, endDate });
  const coverImages = template.images.filter(img => img.type === 'cover');
  const weeklyCalendars = template.images.filter(img => img.type === 'weekly-calendar');
  const dailyPageTemplates = template.images.filter(img => img.type === 'daily-page');

  coverImages.forEach(() => totalSteps++);

  for (const month of months) {
    const monthCovers = template.images.filter(img => img.type === 'month-cover');
    const monthlyCalendars = template.images.filter(img => img.type === 'monthly-calendar');
    const daysInMonth = getDaysOfMonth({ year: month.year, month: month.month });

    if (monthCovers.length > 0) totalSteps++;
    if (monthlyCalendars.length > 0) totalSteps++;

    if (weeklyCalendars.length > 0 && dailyPageTemplates.length > 0) {
      for (const week of month.weeks) {
        totalSteps += weeklyCalendars.length;
        const monthDaysInWeek = week.days.filter(d => d.getMonth() === month.month).length;
        totalSteps += dailyPageTemplates.length * monthDaysInWeek;
      }
    } else {
      if (weeklyCalendars.length > 0) {
        totalSteps += weeklyCalendars.length * month.weeks.length;
      }
      if (dailyPageTemplates.length > 0) {
        totalSteps += dailyPageTemplates.length * daysInMonth.length;
      }
    }
  }

  return totalSteps;
}

export async function generatePlannerPages(
  template: Template,
  startDate: Date,
  endDate: Date,
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedPage[]> {
  const pages: GeneratedPage[] = [];
  const plannerLocale = template.locale ?? 'es';
  const months = getMonthsBetween({ startDate, endDate });
  const totalSteps = countGenerationSteps(template, startDate, endDate);

  let currentStep = 0;
  const updateProgress = () => {
    currentStep++;
    onProgress?.(currentStep, totalSteps);
  };

  const coverImages = template.images.filter(img => img.type === 'cover');
  const weeklyCalendars = template.images.filter(img => img.type === 'weekly-calendar');
  const dailyPageTemplates = template.images.filter(img => img.type === 'daily-page');

  for (const coverImage of coverImages) {
    const page = await generatePage(coverImage, {}, plannerLocale);
    pages.push({ ...page, pageNumber: pages.length + 1, type: 'cover' });
    updateProgress();
  }

  for (const month of months) {
    const monthCovers = template.images.filter(img => img.type === 'month-cover');
    for (const monthCover of monthCovers) {
      const page = await generatePage(monthCover, {
        year: month.year,
        month: month.month,
        days: month.days,
      }, plannerLocale);
      pages.push({ ...page, pageNumber: pages.length + 1, type: 'month-cover' });
    }
    updateProgress();

    const monthlyCalendars = template.images.filter(img => img.type === 'monthly-calendar');
    for (const monthlyCalendar of monthlyCalendars) {
      const page = await generatePage(monthlyCalendar, {
        year: month.year,
        month: month.month,
        days: month.days,
      }, plannerLocale);
      pages.push({ ...page, pageNumber: pages.length + 1, type: 'monthly-calendar' });
    }
    updateProgress();

    const daysInMonth = getDaysOfMonth({ year: month.year, month: month.month });

    const pushDailyPage = async (
      dailyTemplate: Template['images'][0],
      date: Date
    ) => {
      const page = await generatePage(dailyTemplate, {
        year: date.getFullYear(),
        month: date.getMonth(),
        date,
      }, plannerLocale);
      pages.push({
        ...page,
        pageNumber: pages.length + 1,
        type: 'daily-page',
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      });
      updateProgress();
    };

    if (weeklyCalendars.length > 0 && dailyPageTemplates.length > 0) {
      let weekIndex = 0;
      for (const week of month.weeks) {
        for (const weeklyCalendar of weeklyCalendars) {
          const page = await generatePage(weeklyCalendar, {
            year: month.year,
            month: month.month,
            week,
          }, plannerLocale);
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'weekly-calendar',
            month: month.month,
            year: month.year,
            weekNumber: weekIndex,
          });
          updateProgress();
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
          }, plannerLocale);
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'weekly-calendar',
            month: month.month,
            year: month.year,
            weekNumber: i,
          });
          i++;
          updateProgress();
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
    const page = await generatePage(extra, {}, plannerLocale);
    pages.push({ ...page, pageNumber: pages.length + 1, type: 'extra' });
  }

  return pages;
}

export function buildPdfFromPages(
  pages: GeneratedPage[],
  onProgress?: (current: number, total: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/pdf.worker.ts', import.meta.url),
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

  if (cachedPages && cachedPages.length > 0 && cachedKey === exportKey) {
    pages = cachedPages;
    onProgress(PAGES_WEIGHT * 100, 'pages');
  } else {
    pages = await generatePlannerPages(template, startDate, endDate, (current, total) => {
      const phaseProgress = total > 0 ? current / total : 1;
      onProgress(phaseProgress * PAGES_WEIGHT * 100, 'pages');
    });
  }

  const pdfBytes = await buildPdfFromPages(pages, (current, total) => {
    const phaseProgress = total > 0 ? current / total : 1;
    onProgress(PAGES_WEIGHT * 100 + phaseProgress * PDF_WEIGHT * 100, 'pdf');
  });

  return { pdfBytes, fileName, pages };
}
