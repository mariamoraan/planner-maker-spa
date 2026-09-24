import type { Template, TemplateImage } from '@/features/template';
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
import type {
  WorkerInboundMessage,
  WorkerResponse,
} from '@/features/export/infrastructure/workers/pdf.worker';
import {
  createPdfAssembler,
  embedPageIntoAssembler,
  finalizePdfAssembler,
  type PdfAssemblePage,
} from '@/features/export/domain/services/assemble-pdf';
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
import { canvasToPngBytes, yieldToUi } from '@/features/export/domain/services/canvas-png';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';
import type { PdfPageLink } from '@/features/export/domain/entities/generated-page';

const PREPARE_WEIGHT = 0.02;
const LINKING_WEIGHT = 0.02;
const PAGES_WEIGHT = 0.88;

export type ExportPhase = 'preparing' | 'pages' | 'linking' | 'pdf';

export type ExportPageType = GeneratedPage['type'] | 'blank';

export type ExportPdfStep = 'packaging' | 'embedding' | 'finalizing';

export type ExportProgressDetail = {
  current: number;
  total: number;
  pageType?: ExportPageType;
  pdfStep?: ExportPdfStep;
};

export type ExportProgressCallback = (
  progress: number,
  phase: ExportPhase,
  detail?: ExportProgressDetail,
) => void;

type EmitMeta = {
  type: GeneratedPage['type'];
  year?: number;
  month?: number;
  weekNumber?: number;
  weekStartISO?: string;
  day?: number;
  spreadId?: string;
  spreadFace?: 'left' | 'right';
};

type BlankJob = {
  kind: 'blank';
  index: number;
  pageNumber: number;
};

type RasterJob = {
  kind: 'raster';
  index: number;
  pageNumber: number;
  templateImage: TemplateImage;
  context: FieldValueContext;
  meta: EmitMeta;
};

type PageJob = BlankJob | RasterJob;

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

async function preloadTemplateImages(
  template: Template,
): Promise<Map<string, HTMLImageElement>> {
  const cache = new Map<string, HTMLImageElement>();
  const srcs = [...new Set(template.images.map(image => image.src).filter(Boolean))];
  await Promise.all(
    srcs.map(async src => {
      cache.set(src, await loadImage(src));
    }),
  );
  return cache;
}

async function generatePage(
  templateImage: TemplateImage,
  context: FieldValueContext,
  imageCache: Map<string, HTMLImageElement>,
  plannerLocale: Template['locale'] = 'es',
  paperSize?: PaperSize,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): Promise<{ imageData: Uint8Array; width: number; height: number; paperSize?: PaperSize }> {
  let img = imageCache.get(templateImage.src);
  if (!img) {
    img = await loadImage(templateImage.src);
    imageCache.set(templateImage.src, img);
  }

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
    imageData: await canvasToPngBytes(canvas),
    width: outputSize.width,
    height: outputSize.height,
    paperSize,
  };
}

function buildPagePlan(
  template: Template,
  startDate: Date,
  endDate: Date,
): PageJob[] {
  const jobs: PageJob[] = [];
  const weekStartsOn = resolveTemplateWeekStartsOn(template);
  const months = getMonthsBetween({ startDate, endDate, weekStartsOn });
  const weeklyUnits = unitsForType(template.images, 'weekly-calendar');
  const dailyUnits = unitsForType(template.images, 'daily-page');
  const plannerRange = { plannerStart: startDate, plannerEnd: endDate };

  const pushBlankIfNeededForSpread = () => {
    if ((jobs.length + 1) % 2 !== 0) {
      const index = jobs.length;
      jobs.push({
        kind: 'blank',
        index,
        pageNumber: index + 1,
      });
    }
  };

  const pushRaster = (
    templateImage: TemplateImage,
    context: FieldValueContext,
    meta: EmitMeta,
  ) => {
    const index = jobs.length;
    jobs.push({
      kind: 'raster',
      index,
      pageNumber: index + 1,
      templateImage,
      context,
      meta,
    });
  };

  const emitUnit = (unit: PageUnit, context: FieldValueContext, meta: EmitMeta) => {
    if (unit.kind === 'spread') {
      pushBlankIfNeededForSpread();
      pushRaster(unit.left, context, {
        ...meta,
        spreadId: unit.spreadId,
        spreadFace: 'left',
      });
      pushRaster(unit.right, context, {
        ...meta,
        spreadId: unit.spreadId,
        spreadFace: 'right',
      });
      return;
    }

    pushRaster(unit.page, context, meta);
  };

  for (const unit of unitsForType(template.images, 'cover')) {
    emitUnit(unit, plannerRange, { type: 'cover' });
  }

  for (const year of getYearsBetween(startDate, endDate)) {
    const yearContext = {
      year,
      ...plannerRange,
    };
    for (const unit of unitsForType(template.images, 'yearly-calendar')) {
      emitUnit(unit, yearContext, {
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
      emitUnit(unit, monthContext, {
        type: 'month-cover',
        year: month.year,
        month: month.month,
      });
    }

    for (const unit of unitsForType(template.images, 'monthly-calendar')) {
      emitUnit(unit, monthContext, {
        type: 'monthly-calendar',
        year: month.year,
        month: month.month,
      });
    }

    const daysInMonth = getDaysOfMonth({ year: month.year, month: month.month });

    const emitDaily = (unit: PageUnit, date: Date) => {
      emitUnit(
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
        },
      );
    };

    if (weeklyUnits.length > 0 && dailyUnits.length > 0) {
      let weekIndex = 0;
      for (const week of month.weeks) {
        const weekStartISO = week.days[0] ? toWeekStartISO(week.days[0]) : undefined;
        for (const unit of weeklyUnits) {
          emitUnit(
            unit,
            { year: month.year, month: month.month, week, ...plannerRange },
            {
              type: 'weekly-calendar',
              month: month.month,
              year: month.year,
              weekNumber: weekIndex,
              weekStartISO,
            },
          );
        }

        const monthDaysInWeek = week.days.filter(d => d.getMonth() === month.month);
        for (const date of monthDaysInWeek) {
          for (const unit of dailyUnits) {
            emitDaily(unit, date);
          }
        }

        weekIndex++;
      }
    } else {
      for (const unit of weeklyUnits) {
        let i = 0;
        for (const week of month.weeks) {
          emitUnit(
            unit,
            { year: month.year, month: month.month, week, ...plannerRange },
            {
              type: 'weekly-calendar',
              month: month.month,
              year: month.year,
              weekNumber: i,
              weekStartISO: week.days[0] ? toWeekStartISO(week.days[0]) : undefined,
            },
          );
          i++;
        }
      }

      for (const date of daysInMonth) {
        for (const unit of dailyUnits) {
          emitDaily(unit, date);
        }
      }
    }
  }

  for (const unit of unitsForType(template.images, 'extra')) {
    emitUnit(unit, plannerRange, { type: 'extra' });
  }

  return jobs;
}

export type PageProgressCallback = (
  current: number,
  total: number,
  pageType?: ExportPageType,
) => void;

function buildMetaPagesFromJobs(
  jobs: PageJob[],
  paperSize: PaperSize,
  outputSize: { width: number; height: number },
): GeneratedPage[] {
  return jobs.map(job => {
    if (job.kind === 'blank') {
      return {
        imageData: new Uint8Array(0),
        width: outputSize.width,
        height: outputSize.height,
        paperSize,
        pageNumber: job.pageNumber,
        type: 'extra' as const,
        isBlank: true,
      };
    }

    return {
      imageData: new Uint8Array(0),
      width: outputSize.width,
      height: outputSize.height,
      paperSize,
      pageNumber: job.pageNumber,
      type: job.meta.type,
      templatePageId: job.templateImage.id,
      year: job.meta.year,
      month: job.meta.month,
      weekNumber: job.meta.weekNumber,
      weekStartISO: job.meta.weekStartISO,
      day: job.meta.day,
      spreadId: job.meta.spreadId,
      spreadFace: job.meta.spreadFace,
    };
  });
}

function transferImagePayload(imageData: GeneratedPage['imageData']): {
  imageData: GeneratedPage['imageData'];
  transfer: Transferable[];
} {
  if (!(imageData instanceof Uint8Array)) {
    return { imageData, transfer: [] };
  }

  if (imageData.byteOffset === 0 && imageData.byteLength === imageData.buffer.byteLength) {
    return { imageData, transfer: [imageData.buffer] };
  }

  const copy = imageData.slice();
  return { imageData: copy, transfer: [copy.buffer] };
}

function postWorkerMessage(
  worker: Worker,
  message: WorkerInboundMessage,
  transfer: Transferable[] = [],
): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const handleMessage = (e: MessageEvent<WorkerResponse>) => {
      cleanup();
      resolve(e.data);
    };
    const handleError = () => {
      cleanup();
      reject(new Error('PDF worker failed'));
    };
    const cleanup = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.removeEventListener('messageerror', handleError);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.addEventListener('messageerror', handleError);

    try {
      worker.postMessage(message, transfer);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

async function rasterizeJob(
  job: PageJob,
  imageCache: Map<string, HTMLImageElement>,
  plannerLocale: Template['locale'],
  exportPaperSize: PaperSize,
  weekStartsOn: WeekStartsOn,
  blankFallback: { width: number; height: number },
): Promise<GeneratedPage> {
  if (job.kind === 'blank') {
    return createBlankGeneratedPage(job.index, exportPaperSize, blankFallback);
  }

  const page = await generatePage(
    job.templateImage,
    job.context,
    imageCache,
    plannerLocale,
    exportPaperSize,
    weekStartsOn,
  );

  return {
    ...page,
    pageNumber: job.pageNumber,
    type: job.meta.type,
    templatePageId: job.templateImage.id,
    year: job.meta.year,
    month: job.meta.month,
    weekNumber: job.meta.weekNumber,
    weekStartISO: job.meta.weekStartISO,
    day: job.meta.day,
    spreadId: job.meta.spreadId,
    spreadFace: job.meta.spreadFace,
    links: undefined,
  };
}

async function streamExportWithWorker(
  jobs: PageJob[],
  linksByPageNumber: Map<number, PdfPageLink[]>,
  imageCache: Map<string, HTMLImageElement>,
  plannerLocale: Template['locale'],
  exportPaperSize: PaperSize,
  weekStartsOn: WeekStartsOn,
  blankFallback: { width: number; height: number },
  onPageProgress: PageProgressCallback,
  onFinalizing: () => void,
): Promise<ArrayBuffer> {
  const worker = new PdfWorker();
  const total = jobs.length;

  try {
    const initResponse = await postWorkerMessage(worker, { type: 'init' });
    if (initResponse.status === 'error') {
      throw new Error(initResponse.message);
    }

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const page = await rasterizeJob(
        job,
        imageCache,
        plannerLocale,
        exportPaperSize,
        weekStartsOn,
        blankFallback,
      );
      page.links = linksByPageNumber.get(page.pageNumber);

      const transferred = transferImagePayload(page.imageData);
      const assemblePage: PdfAssemblePage = {
        imageData: transferred.imageData,
        width: page.width,
        height: page.height,
        paperSize: page.paperSize,
        pageNumber: page.pageNumber,
        links: page.links,
      };

      const embedResponse = await postWorkerMessage(
        worker,
        {
          type: 'embedPage',
          page: assemblePage,
          current: i + 1,
          total,
        },
        transferred.transfer,
      );

      if (embedResponse.status === 'error') {
        throw new Error(embedResponse.message);
      }

      onPageProgress(
        i + 1,
        total,
        job.kind === 'blank' ? 'blank' : job.meta.type,
      );
      await yieldToUi();
    }

    onFinalizing();

    const pdfBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const handleMessage = (e: MessageEvent<WorkerResponse>) => {
        const data = e.data;
        if (data.status === 'progress') {
          return;
        }
        cleanup();
        if (data.status === 'success') {
          resolve(data.pdfBytes);
          return;
        }
        reject(new Error(data.status === 'error' ? data.message : 'PDF worker failed'));
      };
      const handleError = () => {
        cleanup();
        reject(new Error('PDF worker failed during finalize'));
      };
      const cleanup = () => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        worker.removeEventListener('messageerror', handleError);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.addEventListener('messageerror', handleError);
      worker.postMessage({ type: 'finalize', total } satisfies WorkerInboundMessage);
    });

    return pdfBytes;
  } finally {
    try {
      worker.terminate();
    } catch {
      /* ignore */
    }
  }
}

async function streamExportOnMainThread(
  jobs: PageJob[],
  linksByPageNumber: Map<number, PdfPageLink[]>,
  imageCache: Map<string, HTMLImageElement>,
  plannerLocale: Template['locale'],
  exportPaperSize: PaperSize,
  weekStartsOn: WeekStartsOn,
  blankFallback: { width: number; height: number },
  onPageProgress: PageProgressCallback,
  onFinalizing: () => void,
): Promise<ArrayBuffer> {
  const assembler = await createPdfAssembler();
  const total = jobs.length;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const page = await rasterizeJob(
      job,
      imageCache,
      plannerLocale,
      exportPaperSize,
      weekStartsOn,
      blankFallback,
    );

    await embedPageIntoAssembler(
      assembler,
      {
        imageData: page.imageData,
        width: page.width,
        height: page.height,
        paperSize: page.paperSize,
        pageNumber: page.pageNumber,
        links: linksByPageNumber.get(page.pageNumber),
      },
      i,
    );

    onPageProgress(
      i + 1,
      total,
      job.kind === 'blank' ? 'blank' : job.meta.type,
    );
    await yieldToUi();
  }

  // Apply links (embed may have set them already; ensure map wins)
  for (const [pageNumber, links] of linksByPageNumber) {
    const idx = pageNumber - 1;
    if (idx >= 0 && idx < assembler.pdfPages.length) {
      assembler.pdfPages[idx].links = links;
    }
  }

  return finalizePdfAssembler(assembler, {
    fastSave: false,
    onFinalizing,
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
  includeInternalLinks?: boolean;
  onProgress: ExportProgressCallback;
}

export async function runExport({
  template,
  startDate,
  endDate,
  includeInternalLinks = true,
  onProgress,
}: RunExportOptions): Promise<{ pdfBytes: ArrayBuffer; fileName: string; pageCount: number }> {
  const fileName = `${template.name}.pdf`;
  const exportPaperSize = template.paperSize ?? inferTemplatePaperSize(template);
  const weekStartsOn = resolveTemplateWeekStartsOn(template);
  const blankFallback = paperSizeToPixels(exportPaperSize);
  const plannerLocale = template.locale ?? 'es';

  const prepareEnd = PREPARE_WEIGHT * 100;
  const linkingEnd = (PREPARE_WEIGHT + LINKING_WEIGHT) * 100;
  const pagesEnd = (PREPARE_WEIGHT + LINKING_WEIGHT + PAGES_WEIGHT) * 100;

  onProgress(0, 'preparing', { current: 0, total: 1 });
  await waitForCustomFontsReady();
  const imageCache = await preloadTemplateImages(template);
  await yieldToUi();

  const jobs = buildPagePlan(template, startDate, endDate);
  const totalPages = Math.max(jobs.length, 1);

  onProgress(clampProgress(prepareEnd), 'linking', {
    current: 0,
    total: totalPages,
  });

  const metaPages = buildMetaPagesFromJobs(jobs, exportPaperSize, blankFallback);
  const linkedMetas = attachPdfLinks(template, metaPages, {
    startDate,
    endDate,
    enabled: includeInternalLinks,
    weekStartsOn,
  });
  const linksByPageNumber = new Map<number, PdfPageLink[]>();
  for (const page of linkedMetas) {
    linksByPageNumber.set(page.pageNumber, page.links ?? []);
  }

  onProgress(clampProgress(linkingEnd), 'pages', {
    current: 0,
    total: totalPages,
  });

  const onPageProgress: PageProgressCallback = (current, total, pageType) => {
    const ratio = total > 0 ? current / total : 1;
    onProgress(clampProgress(linkingEnd + ratio * PAGES_WEIGHT * 100), 'pages', {
      current,
      total,
      pageType,
    });
  };

  const onFinalizing = () => {
    onProgress(clampProgress(pagesEnd), 'pdf', {
      current: totalPages,
      total: totalPages,
      pdfStep: 'finalizing',
    });
  };

  let pdfBytes: ArrayBuffer;
  try {
    pdfBytes = await streamExportWithWorker(
      jobs,
      linksByPageNumber,
      imageCache,
      plannerLocale,
      exportPaperSize,
      weekStartsOn,
      blankFallback,
      onPageProgress,
      onFinalizing,
    );
  } catch {
    pdfBytes = await streamExportOnMainThread(
      jobs,
      linksByPageNumber,
      imageCache,
      plannerLocale,
      exportPaperSize,
      weekStartsOn,
      blankFallback,
      onPageProgress,
      onFinalizing,
    );
  }

  onProgress(100, 'pdf', {
    current: totalPages,
    total: totalPages,
    pdfStep: 'finalizing',
  });

  return { pdfBytes, fileName, pageCount: totalPages };
}
