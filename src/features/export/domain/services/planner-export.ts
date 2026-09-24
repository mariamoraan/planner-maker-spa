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
  getYearsBetween,
  renderFieldOnCanvas,
  type FieldValueContext,
} from '@/features/editor/domain/services/planner-utils';
import { resolveWorldRect } from '@/features/editor/domain/services/block-geometry';
import { resolveLocale, DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import type { WeekStartsOn } from '@/features/template';
import type { PageUnit } from '@/features/template/domain/services/template-spread';
import PdfWorker from '@/features/export/infrastructure/workers/pdf.worker?worker';
import type { WorkerResponse } from '@/features/export/infrastructure/workers/pdf.worker';
import { assemblePdfFromPages } from '@/features/export/domain/services/assemble-pdf';
import {
  attachPdfLinks,
  toWeekStartISO,
} from '@/features/export/domain/services/pdf-page-links';
import {
  createBlankGeneratedPage,
  sumPageCountWithParity,
  unitFaceCount,
  unitsForType,
} from '@/features/export/domain/services/spread-export';
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
  return `${templateId}:${startDate.toISOString()}:${endDate.toISOString()}:${updatedAt.getTime()}:links=${includeInternalLinks ? 1 : 0}:spreads=1`;
}

export function estimatePageCount(
  template: Template,
  startDate: Date,
  endDate: Date
): number {
  const months = getMonthsBetween({
    startDate,
    endDate,
    weekStartsOn: resolveTemplateWeekStartsOn(template),
  });
  const coverUnits = unitsForType(template.images, 'cover');
  const weeklyUnits = unitsForType(template.images, 'weekly-calendar');
  const dailyUnits = unitsForType(template.images, 'daily-page');
  const faceCounts: number[] = [];

  for (const unit of coverUnits) {
    faceCounts.push(unitFaceCount(unit));
  }

  const years = getYearsBetween(startDate, endDate);
  const yearlyUnits = unitsForType(template.images, 'yearly-calendar');
  for (const _year of years) {
    for (const unit of yearlyUnits) {
      faceCounts.push(unitFaceCount(unit));
    }
  }

  for (const month of months) {
    const monthCoverUnits = unitsForType(template.images, 'month-cover');
    const monthlyUnits = unitsForType(template.images, 'monthly-calendar');
    const daysInMonth = getDaysOfMonth({ year: month.year, month: month.month });

    for (const unit of monthCoverUnits) faceCounts.push(unitFaceCount(unit));
    for (const unit of monthlyUnits) faceCounts.push(unitFaceCount(unit));

    if (weeklyUnits.length > 0 && dailyUnits.length > 0) {
      for (const week of month.weeks) {
        for (const unit of weeklyUnits) faceCounts.push(unitFaceCount(unit));
        const monthDaysInWeek = week.days.filter(d => d.getMonth() === month.month).length;
        for (let d = 0; d < monthDaysInWeek; d++) {
          for (const unit of dailyUnits) faceCounts.push(unitFaceCount(unit));
        }
      }
    } else {
      if (weeklyUnits.length > 0) {
        for (const unit of weeklyUnits) {
          for (let w = 0; w < month.weeks.length; w++) {
            faceCounts.push(unitFaceCount(unit));
          }
        }
      }
      if (dailyUnits.length > 0) {
        for (let d = 0; d < daysInMonth.length; d++) {
          for (const unit of dailyUnits) faceCounts.push(unitFaceCount(unit));
        }
      }
    }
  }

  for (const unit of unitsForType(template.images, 'extra')) {
    faceCounts.push(unitFaceCount(unit));
  }

  return sumPageCountWithParity(faceCounts);
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

  const weeklyUnits = unitsForType(template.images, 'weekly-calendar');
  const dailyUnits = unitsForType(template.images, 'daily-page');
  const exportPaperSize = template.paperSize ?? inferTemplatePaperSize(template);
  const plannerRange = { plannerStart: startDate, plannerEnd: endDate };
  const blankFallback = paperSizeToPixels(exportPaperSize);

  type EmitMeta = {
    type: GeneratedPage['type'];
    year?: number;
    month?: number;
    weekNumber?: number;
    weekStartISO?: string;
    day?: number;
  };

  const pushBlankIfNeededForSpread = () => {
    if ((pages.length + 1) % 2 !== 0) {
      pages.push(createBlankGeneratedPage(pages.length, exportPaperSize, blankFallback));
      reportProgress();
    }
  };

  const pushGeneratedFace = async (
    templateImage: Template['images'][0],
    context: FieldValueContext,
    meta: EmitMeta & { spreadId?: string; spreadFace?: 'left' | 'right' }
  ) => {
    const page = await generatePage(
      templateImage,
      context,
      plannerLocale,
      exportPaperSize,
      weekStartsOn,
    );
    pages.push({
      ...page,
      pageNumber: pages.length + 1,
      type: meta.type,
      templatePageId: templateImage.id,
      year: meta.year,
      month: meta.month,
      weekNumber: meta.weekNumber,
      weekStartISO: meta.weekStartISO,
      day: meta.day,
      spreadId: meta.spreadId,
      spreadFace: meta.spreadFace,
    });
    reportProgress();
  };

  const emitUnit = async (
    unit: PageUnit,
    context: FieldValueContext,
    meta: EmitMeta
  ) => {
    if (unit.kind === 'spread') {
      pushBlankIfNeededForSpread();
      await pushGeneratedFace(unit.left, context, {
        ...meta,
        spreadId: unit.spreadId,
        spreadFace: 'left',
      });
      await pushGeneratedFace(unit.right, context, {
        ...meta,
        spreadId: unit.spreadId,
        spreadFace: 'right',
      });
      return;
    }

    await pushGeneratedFace(unit.page, context, meta);
  };

  for (const unit of unitsForType(template.images, 'cover')) {
    await emitUnit(unit, plannerRange, { type: 'cover' });
  }

  for (const year of getYearsBetween(startDate, endDate)) {
    const yearContext = {
      year,
      ...plannerRange,
    };
    for (const unit of unitsForType(template.images, 'yearly-calendar')) {
      await emitUnit(unit, yearContext, {
        type: 'yearly-calendar',
        year,
      });
    }
  }

  for (const month of months) {
    const monthContext = {
      year: month.year,
      month: month.month,
      days: month.days,
      ...plannerRange,
    };

    for (const unit of unitsForType(template.images, 'month-cover')) {
      await emitUnit(unit, monthContext, {
        type: 'month-cover',
        year: month.year,
        month: month.month,
      });
    }

    for (const unit of unitsForType(template.images, 'monthly-calendar')) {
      await emitUnit(unit, monthContext, {
        type: 'monthly-calendar',
        year: month.year,
        month: month.month,
      });
    }

    const daysInMonth = getDaysOfMonth({ year: month.year, month: month.month });

    const emitDaily = async (unit: PageUnit, date: Date) => {
      await emitUnit(
        unit,
        {
          year: date.getFullYear(),
          month: date.getMonth(),
          date,
          ...plannerRange,
        },
        {
          type: 'daily-page',
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
        }
      );
    };

    if (weeklyUnits.length > 0 && dailyUnits.length > 0) {
      let weekIndex = 0;
      for (const week of month.weeks) {
        const weekStartISO = week.days[0] ? toWeekStartISO(week.days[0]) : undefined;
        for (const unit of weeklyUnits) {
          await emitUnit(
            unit,
            { year: month.year, month: month.month, week, ...plannerRange },
            {
              type: 'weekly-calendar',
              month: month.month,
              year: month.year,
              weekNumber: weekIndex,
              weekStartISO,
            }
          );
        }

        const monthDaysInWeek = week.days.filter(d => d.getMonth() === month.month);
        for (const date of monthDaysInWeek) {
          for (const unit of dailyUnits) {
            await emitDaily(unit, date);
          }
        }

        weekIndex++;
      }
    } else {
      for (const unit of weeklyUnits) {
        let i = 0;
        for (const week of month.weeks) {
          await emitUnit(
            unit,
            { year: month.year, month: month.month, week, ...plannerRange },
            {
              type: 'weekly-calendar',
              month: month.month,
              year: month.year,
              weekNumber: i,
              weekStartISO: week.days[0] ? toWeekStartISO(week.days[0]) : undefined,
            }
          );
          i++;
        }
      }

      for (const date of daysInMonth) {
        for (const unit of dailyUnits) {
          await emitDaily(unit, date);
        }
      }
    }
  }

  for (const unit of unitsForType(template.images, 'extra')) {
    await emitUnit(unit, plannerRange, { type: 'extra' });
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
