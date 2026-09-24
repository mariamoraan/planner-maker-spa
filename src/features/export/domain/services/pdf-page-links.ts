import { format, startOfWeek } from 'date-fns';
import type { Template, TemplateImage, Rectangle } from '@/features/template';
import {
  DEFAULT_WEEK_STARTS_ON,
  inferTemplatePaperSize,
  paperSizeToPixels,
  resolveWeekStartsOn,
  type PaperSize,
  type WeekStartsOn,
} from '@/features/template';
import type { GeneratedPage, PdfPageLink } from '@/features/export/domain/entities/generated-page';
import { resolvePdfPageSizeForExport } from '@/features/export/domain/services/pdf-page-size';
import {
  getMonthsBetween,
  resolveBindingDate,
  type FieldValueContext,
} from '@/features/editor/domain/services/planner-utils';
import {
  orientedRectAabb,
  resolveWorldRect,
} from '@/features/editor/domain/services/block-geometry';

export type PageDestinationIndex = {
  daily: Map<string, number>;
  month: Map<string, number>;
  week: Map<string, number>;
};

export function dailyDestinationKey(year: number, month: number, day: number): string {
  return `daily:${year}-${month}-${day}`;
}

export function monthDestinationKey(year: number, month: number): string {
  return `month:${year}-${month}`;
}

export function weekDestinationKey(weekStartISO: string): string {
  return `week:${weekStartISO}`;
}

export function toWeekStartISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** First matching page wins when multiple templates share a destination. Prefer left faces (emitted first). */
export function buildDestinationIndex(pages: GeneratedPage[]): PageDestinationIndex {
  const daily = new Map<string, number>();
  const month = new Map<string, number>();
  const week = new Map<string, number>();

  for (const page of pages) {
    if (page.isBlank) continue;

    if (
      page.type === 'daily-page' &&
      page.year != null &&
      page.month != null &&
      page.day != null
    ) {
      const key = dailyDestinationKey(page.year, page.month, page.day);
      if (!daily.has(key)) daily.set(key, page.pageNumber);
    }

    if (page.type === 'weekly-calendar' && page.weekStartISO) {
      const key = weekDestinationKey(page.weekStartISO);
      if (!week.has(key)) week.set(key, page.pageNumber);
    }
  }

  // Prefer first monthly-calendar; fall back to first month-cover.
  for (const page of pages) {
    if (page.isBlank) continue;
    if (page.type !== 'monthly-calendar' || page.year == null || page.month == null) continue;
    const key = monthDestinationKey(page.year, page.month);
    if (!month.has(key)) month.set(key, page.pageNumber);
  }
  for (const page of pages) {
    if (page.isBlank) continue;
    if (page.type !== 'month-cover' || page.year == null || page.month == null) continue;
    const key = monthDestinationKey(page.year, page.month);
    if (!month.has(key)) month.set(key, page.pageNumber);
  }

  return { daily, month, week };
}

export type AxisAlignedBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Convert a template-space AABB (top-left origin) into a PDF link rect
 * (bottom-left origin, points).
 */
export function templateAabbToPdfLinkRect(
  aabb: AxisAlignedBounds,
  templateSize: { width: number; height: number },
  outputSize: { width: number; height: number },
  pdfPageSize: { width: number; height: number },
): Omit<PdfPageLink, 'destPageNumber'> {
  const scaleX = outputSize.width / templateSize.width;
  const scaleY = outputSize.height / templateSize.height;

  const xPx = aabb.x * scaleX;
  const yPx = aabb.y * scaleY;
  const wPx = aabb.width * scaleX;
  const hPx = aabb.height * scaleY;

  const sx = pdfPageSize.width / outputSize.width;
  const sy = pdfPageSize.height / outputSize.height;

  const width = wPx * sx;
  const height = hPx * sy;
  const x = xPx * sx;
  const y = pdfPageSize.height - (yPx + hPx) * sy;

  return { x, y, width, height };
}

function shouldLinkDayCell(
  pageType: TemplateImage['type'],
  rectangle: Rectangle,
): boolean {
  if (rectangle.fieldType !== 'day') return false;
  return pageType === 'monthly-calendar' || pageType === 'weekly-calendar';
}

function shouldLinkMonthBlock(
  pageType: TemplateImage['type'],
  rectangle: Rectangle,
): boolean {
  if (rectangle.fieldType !== 'month') return false;
  return (
    pageType === 'cover' ||
    pageType === 'month-cover' ||
    pageType === 'monthly-calendar' ||
    pageType === 'weekly-calendar' ||
    pageType === 'daily-page'
  );
}

function resolveLinkDestination(
  pageType: TemplateImage['type'],
  rectangle: Rectangle,
  templateImage: TemplateImage,
  context: FieldValueContext,
  weekStartsOn: WeekStartsOn,
  index: PageDestinationIndex,
): number | null {
  if (shouldLinkDayCell(pageType, rectangle)) {
    const { date } = resolveBindingDate({
      rectangle,
      templateImage,
      context,
      weekStartsOn,
    });
    if (!date) return null;

    const dailyKey = dailyDestinationKey(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const dailyPage = index.daily.get(dailyKey);
    if (dailyPage != null) return dailyPage;

    // Fallback: jump to the weekly spread that contains this day
    const weekStart = startOfWeekForDate(date, weekStartsOn);
    const weeklyPage = index.week.get(weekDestinationKey(toWeekStartISO(weekStart)));
    if (weeklyPage != null) return weeklyPage;

    // Fallback: monthly calendar (or month-cover) for that date's month
    return index.month.get(monthDestinationKey(date.getFullYear(), date.getMonth())) ?? null;
  }

  if (shouldLinkMonthBlock(pageType, rectangle)) {
    const { date } = resolveBindingDate({
      rectangle,
      templateImage,
      context,
      weekStartsOn,
    });
    if (!date) {
      if (context.year != null && context.month != null) {
        return index.month.get(monthDestinationKey(context.year, context.month)) ?? null;
      }
      return null;
    }
    return (
      index.month.get(monthDestinationKey(date.getFullYear(), date.getMonth())) ?? null
    );
  }

  return null;
}

function startOfWeekForDate(date: Date, weekStartsOn: WeekStartsOn): Date {
  return startOfWeek(date, { weekStartsOn: resolveWeekStartsOn(weekStartsOn) });
}

export function collectLinksForTemplatePage({
  templateImage,
  context,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
  outputSize,
  paperSize,
  index,
}: {
  templateImage: TemplateImage;
  context: FieldValueContext;
  weekStartsOn?: WeekStartsOn;
  outputSize: { width: number; height: number };
  paperSize?: PaperSize;
  index: PageDestinationIndex;
}): PdfPageLink[] {
  const pdfPageSize = resolvePdfPageSizeForExport(
    outputSize.width,
    outputSize.height,
    paperSize,
  );
  const templateSize = {
    width: templateImage.width,
    height: templateImage.height,
  };
  const links: PdfPageLink[] = [];

  for (const rectangle of templateImage.rectangles) {
    const destPageNumber = resolveLinkDestination(
      templateImage.type,
      rectangle,
      templateImage,
      context,
      weekStartsOn,
      index,
    );
    if (destPageNumber == null) continue;

    const world = resolveWorldRect(rectangle, templateImage.gridGroups);
    const aabb = orientedRectAabb(world);
    const rect = templateAabbToPdfLinkRect(aabb, templateSize, outputSize, pdfPageSize);

    if (rect.width <= 0 || rect.height <= 0) continue;

    links.push({ ...rect, destPageNumber });
  }

  return links;
}

function findTemplatePage(
  template: Template,
  templatePageId: string | undefined,
  type: GeneratedPage['type'],
): TemplateImage | undefined {
  if (templatePageId) {
    return template.images.find(img => img.id === templatePageId);
  }
  return template.images.find(img => img.type === type);
}

function buildContextForPage(
  page: GeneratedPage,
  months: ReturnType<typeof getMonthsBetween>,
  plannerStart: Date,
  plannerEnd: Date,
): FieldValueContext {
  const plannerRange = { plannerStart, plannerEnd };

  if (page.type === 'cover' || page.type === 'extra') {
    return plannerRange;
  }

  if (page.year == null || page.month == null) {
    return plannerRange;
  }

  const monthData = months.find(m => m.year === page.year && m.month === page.month);

  if (page.type === 'month-cover' || page.type === 'monthly-calendar') {
    return {
      year: page.year,
      month: page.month,
      days: monthData?.days,
      ...plannerRange,
    };
  }

  if (page.type === 'weekly-calendar') {
    const week =
      page.weekNumber != null ? monthData?.weeks[page.weekNumber] : undefined;
    return {
      year: page.year,
      month: page.month,
      week,
      ...plannerRange,
    };
  }

  if (page.type === 'daily-page' && page.day != null) {
    return {
      year: page.year,
      month: page.month,
      date: new Date(page.year, page.month, page.day),
      ...plannerRange,
    };
  }

  return plannerRange;
}

/**
 * Second pass after raster generation: attach inferred internal PDF links.
 * Does not re-rasterize pages.
 */
export function attachPdfLinks(
  template: Template,
  pages: GeneratedPage[],
  options: {
    startDate: Date;
    endDate: Date;
    enabled?: boolean;
    weekStartsOn?: WeekStartsOn;
  },
): GeneratedPage[] {
  const enabled = options.enabled !== false;
  if (!enabled || pages.length === 0) {
    return pages.map(page => ({ ...page, links: undefined }));
  }

  const weekStartsOn = options.weekStartsOn ?? template.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;
  const exportPaperSize = template.paperSize ?? inferTemplatePaperSize(template);
  const months = getMonthsBetween({
    startDate: options.startDate,
    endDate: options.endDate,
    weekStartsOn,
  });
  const index = buildDestinationIndex(pages);

  return pages.map(page => {
    if (page.isBlank || !page.templatePageId) {
      return { ...page, links: [] };
    }

    const templateImage = findTemplatePage(template, page.templatePageId, page.type);
    if (!templateImage) {
      return { ...page, links: [] };
    }

    const outputSize =
      page.width && page.height
        ? { width: page.width, height: page.height }
        : paperSizeToPixels(exportPaperSize);

    const context = buildContextForPage(
      page,
      months,
      options.startDate,
      options.endDate,
    );

    const links = collectLinksForTemplatePage({
      templateImage,
      context,
      weekStartsOn,
      outputSize,
      paperSize: page.paperSize ?? exportPaperSize,
      index,
    });

    return { ...page, links };
  });
}
