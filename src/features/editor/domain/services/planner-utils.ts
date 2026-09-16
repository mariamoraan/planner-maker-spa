import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  getISOWeek,
  getWeek,
} from 'date-fns';
import type { Locale } from 'date-fns';
import type {
  Rectangle,
  FieldType,
  TemplateImage,
  WeekStartsOn,
  CompositePart,
  FormatVariant,
} from '@/features/template';
import { DEFAULT_COMPOSITE_PARTS } from '@/features/template';
import { ensureDataUrl, isHttpUrl } from '@/core/functions/image-data-url';
import {
  SECONDARY_COLOR,
  getFormatVariant,
  resolveFieldStyle,
  resolveCanvasTextX,
  resolveCanvasTextY,
  buildCanvasFont,
  formatFieldValue,
  isYearFormatVariant,
  isMonthFormatVariant,
  isDayFormatVariant,
  normalizeStartEndFormatVariant,
} from '@/features/editor/domain/services/field-style-config';
import {
  DEFAULT_LOCALE,
  DEFAULT_WEEK_STARTS_ON,
  formatMonthName,
  formatWeekdayName,
  resolveWeekStartsOn,
} from '@/features/template/domain/services/locale-config';
import { degToRad } from '@/features/editor/domain/services/block-geometry';

/** @deprecated Use formatMonthName with locale instead */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MonthData {
  month: number;
  year: number;
  name: string;
  weeks: WeekData[];
  days: Date[];
}

export interface WeekData {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
}

export interface FieldValueContext {
  year?: number;
  month?: number;
  week?: WeekData;
  days?: Date[];
  date?: Date;
  plannerStart?: Date;
  plannerEnd?: Date;
}

export function getMonthDatesForGrid({
  year,
  month,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
}: {
  year: number;
  month: number;
  weekStartsOn?: WeekStartsOn;
}): Date[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekStartOption = resolveWeekStartsOn(weekStartsOn);
  const gridStart = startOfWeek(firstDayOfMonth, { weekStartsOn: weekStartOption });
  const leadingDays = Math.round(
    (firstDayOfMonth.getTime() - gridStart.getTime()) / 86400000
  );
  const totalDays = leadingDays + daysInMonth;

  return Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
}

/** @deprecated Use getMonthDatesForGrid with weekStartsOn: 'monday' instead */
export function getMonthDatesStartingOnMonday({
  year,
  month,
}: {
  year: number;
  month: number;
}): Date[] {
  return getMonthDatesForGrid({ year, month, weekStartsOn: 'monday' });
}

export function getDaysOfMonth({ year, month }: { year: number; month: number }): Date[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: Date[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day));
  }

  return dates;
}

export function getWeekNumber(date: Date, weekStartsOn: WeekStartsOn): number {
  if (weekStartsOn === 'monday') {
    return getISOWeek(date);
  }
  return getWeek(date, { weekStartsOn: 0 });
}

function getCalendarWeeks({
  year,
  month,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
}: {
  year: number;
  month: number;
  weekStartsOn?: WeekStartsOn;
}): WeekData[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const weekStartOption = resolveWeekStartsOn(weekStartsOn);

  const rangeStart = startOfWeek(firstDayOfMonth, { weekStartsOn: weekStartOption });
  const rangeEnd = endOfWeek(lastDayOfMonth, { weekStartsOn: weekStartOption });

  const weeks: WeekData[] = [];
  let current = rangeStart;

  while (current <= rangeEnd) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(current, i));
    weeks.push({
      weekNumber: getWeekNumber(days[0], weekStartsOn),
      startDate: days[0],
      endDate: days[6],
      days,
    });
    current = addDays(current, 7);
  }

  return weeks;
}


export function getMonthsBetween({
  startDate,
  endDate,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
}: {
  startDate: Date;
  endDate: Date;
  weekStartsOn?: WeekStartsOn;
}): MonthData[] {
  const months: MonthData[] = [];
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth();

    const monthDates = getMonthDatesForGrid({ year, month, weekStartsOn });
    const weeks = getCalendarWeeks({ year, month, weekStartsOn });

    months.push({
      year,
      month,
      name: current.toLocaleString('default', { month: 'long' }),
      weeks,
      days: monthDates,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export function getEditorPreviewContext(
  templateImage: TemplateImage,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
  plannerRange?: { plannerStart?: Date; plannerEnd?: Date },
): FieldValueContext {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const plannerStart = plannerRange?.plannerStart ?? new Date(year, 0, 1);
  const plannerEnd = plannerRange?.plannerEnd ?? new Date(year, 11, 31);

  switch (templateImage.type) {
    case 'daily-page':
      return { date: firstOfMonth, year, month, plannerStart, plannerEnd };
    case 'month-cover':
      return { year, month, plannerStart, plannerEnd };
    case 'monthly-calendar':
      return {
        year,
        month,
        days: getMonthDatesForGrid({ year, month, weekStartsOn }),
        plannerStart,
        plannerEnd,
      };
    case 'weekly-calendar': {
      const weekStartOption = resolveWeekStartsOn(weekStartsOn);
      const weekStart = startOfWeek(firstOfMonth, { weekStartsOn: weekStartOption });
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      return {
        year,
        month,
        week: {
          weekNumber: getWeekNumber(days[0], weekStartsOn),
          startDate: days[0],
          endDate: days[6],
          days,
        },
        plannerStart,
        plannerEnd,
      };
    }
    case 'cover':
    case 'extra':
      return { plannerStart, plannerEnd, year: plannerStart.getFullYear(), date: plannerStart };
    default:
      return { year, month, date: firstOfMonth, plannerStart, plannerEnd };
  }
}

function formatYearValue(date: Date, formatVariant: FormatVariant): string {
  if (isYearFormatVariant(formatVariant)) {
    return formatVariant === 'YY' ? format(date, 'yy') : format(date, 'yyyy');
  }
  return format(date, 'yyyy');
}

function formatMonthValue(date: Date, formatVariant: FormatVariant, locale: Locale): string {
  if (isMonthFormatVariant(formatVariant)) {
    return formatVariant === 'numeric'
      ? format(date, 'M')
      : formatMonthName(date, locale);
  }
  return formatMonthName(date, locale);
}

function formatDayValue(date: Date, formatVariant: FormatVariant, locale: Locale): string {
  if (isDayFormatVariant(formatVariant)) {
    return formatVariant === 'numeric'
      ? format(date, 'd')
      : formatWeekdayName(date, locale);
  }
  return format(date, 'd');
}

function formatStartEndValue(date: Date, formatVariant: FormatVariant, locale: Locale): string {
  const variant = normalizeStartEndFormatVariant(formatVariant);
  switch (variant) {
    case 'dayNumeric':
      return format(date, 'd');
    case 'weekdayName':
      return formatWeekdayName(date, locale);
    case 'monthNumeric':
      return format(date, 'M');
    case 'monthName':
      return formatMonthName(date, locale);
    case 'YYYY':
      return format(date, 'yyyy');
    case 'YY':
      return format(date, 'yy');
  }
}

function resolveFieldColor(isInCurrentMonth: boolean, userColor: string): string {
  return isInCurrentMonth ? userColor : SECONDARY_COLOR;
}

export function resolveRangeEndpointDate(
  which: 'start' | 'end',
  context: FieldValueContext,
  templateImage: TemplateImage,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
): Date | null {
  switch (templateImage.type) {
    case 'weekly-calendar': {
      if (!context.week) return null;
      return which === 'start'
        ? context.week.days[0] ?? null
        : context.week.days.at(-1) ?? null;
    }
    case 'daily-page': {
      if (!context.date) return null;
      const weekStartOption = resolveWeekStartsOn(weekStartsOn);
      return which === 'start'
        ? startOfWeek(context.date, { weekStartsOn: weekStartOption })
        : endOfWeek(context.date, { weekStartsOn: weekStartOption });
    }
    case 'monthly-calendar':
    case 'month-cover': {
      if (context.year === undefined || context.month === undefined) return null;
      return which === 'start'
        ? new Date(context.year, context.month, 1)
        : new Date(context.year, context.month + 1, 0);
    }
    case 'cover':
    case 'extra':
      return which === 'start'
        ? context.plannerStart ?? null
        : context.plannerEnd ?? null;
    default:
      return null;
  }
}

export function resolveCompositeAnchorDate(
  context: FieldValueContext,
  templateImage: TemplateImage,
): Date | null {
  switch (templateImage.type) {
    case 'daily-page':
      return context.date ?? null;
    case 'weekly-calendar':
      return context.week?.days[0] ?? null;
    case 'monthly-calendar':
    case 'month-cover':
      if (context.year === undefined || context.month === undefined) return null;
      return new Date(context.year, context.month, 1);
    case 'cover':
    case 'extra':
      return context.plannerStart ?? null;
    default:
      return context.date ?? context.plannerStart ?? null;
  }
}

export function resolveWeekNumberDate(
  context: FieldValueContext,
  templateImage: TemplateImage,
): Date | null {
  switch (templateImage.type) {
    case 'weekly-calendar':
      return context.week?.days[0] ?? null;
    case 'daily-page':
      return context.date ?? null;
    case 'cover':
    case 'extra':
      return context.plannerStart ?? null;
    default:
      return null;
  }
}

function formatCompositePart(
  part: CompositePart,
  date: Date,
  locale: Locale,
  weekStartsOn: WeekStartsOn,
): string {
  switch (part.kind) {
    case 'weekday':
      return formatWeekdayName(date, locale);
    case 'day':
      return format(date, 'd');
    case 'month':
      return part.variant === 'numeric'
        ? format(date, 'M')
        : formatMonthName(date, locale);
    case 'year':
      return part.variant === 'YY' ? format(date, 'yy') : format(date, 'yyyy');
    case 'weekNumber':
      return String(getWeekNumber(date, weekStartsOn));
    case 'literal':
      return part.value;
  }
}

export function resolveCompositeParts(rectangle: Rectangle): CompositePart[] {
  return rectangle.compositeParts?.length
    ? rectangle.compositeParts
    : DEFAULT_COMPOSITE_PARTS;
}

/**
 * Get field value based on type and context
 */
export function getFieldValue({
  fieldType,
  context,
  templateImage,
  rectangle,
  fillIncompleteWeeks,
  fillIncompleteMonths,
  locale = DEFAULT_LOCALE,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
}: {
  fieldType: FieldType,
  context: FieldValueContext,
  templateImage: TemplateImage,
  rectangle: Rectangle,
  fillIncompleteWeeks?: boolean;
  fillIncompleteMonths?: boolean;
  locale?: Locale;
  weekStartsOn?: WeekStartsOn;
}): {fieldValue: string, fieldColor: string} {
  const dateContext = context.date;
  const formatVariant = getFormatVariant(rectangle);
  const style = resolveFieldStyle(rectangle);
  const userColor = style.color;
  const localeCode = locale.code ?? 'es';

  const result = (fieldValue: string, fieldColor: string) => ({
    fieldValue: formatFieldValue(fieldValue, style, localeCode),
    fieldColor,
  });

  switch (fieldType) {
    case 'year':
      if (dateContext) {
        return result(formatYearValue(dateContext, formatVariant), userColor);
      }
      if (context.year !== undefined) {
        const yearDate = new Date(context.year, 0, 1);
        return result(formatYearValue(yearDate, formatVariant), userColor);
      }
      return result('', userColor);
    case 'month':
      if (dateContext) {
        return result(formatMonthValue(dateContext, formatVariant, locale), userColor);
      }
      if (context.month !== undefined && context.year !== undefined) {
        const monthDate = new Date(context.year, context.month, 1);
        return result(formatMonthValue(monthDate, formatVariant, locale), userColor);
      }
      return result('', userColor);
    case 'day':
      if (dateContext) {
        return result(formatDayValue(dateContext, formatVariant, locale), userColor);
      }
      if (context.week) {
        const dayRectangles = templateImage.rectangles.filter(rect => rect.fieldType === 'day').sort((a, b) => a.order - b.order );

        const index = dayRectangles.indexOf(rectangle);
        if (index >= 0 && index < context.week.days.length) {
          const day = context.week.days[index];
          const isDayInCurrentMonth = day.getMonth() === context.month;
          if(fillIncompleteWeeks) {
            return result(
              formatDayValue(day, formatVariant, locale),
              resolveFieldColor(isDayInCurrentMonth, userColor),
            );
          }
          else if (isDayInCurrentMonth) {
            return result(formatDayValue(day, formatVariant, locale), userColor);
          }
        }
      }
      if (context.days) {
        const dayRectangles = templateImage.rectangles.filter(rect => rect.fieldType === 'day').sort((a, b) => a.order - b.order );

        const index = dayRectangles.indexOf(rectangle);
        if (index >= 0 && index < context.days.length) {
          const day = context.days[index];
          const isDayInCurrentMonth = day.getMonth() === context.month;
          if(fillIncompleteMonths) {
            return result(
              formatDayValue(day, formatVariant, locale),
              resolveFieldColor(isDayInCurrentMonth, userColor),
            );
          }
          else if (isDayInCurrentMonth) {
            return result(formatDayValue(day, formatVariant, locale), userColor);
          }
        }
      }
      return result('', userColor);
    case 'startDay': {
      const startDate = resolveRangeEndpointDate('start', context, templateImage, weekStartsOn);
      if (!startDate) return result('', userColor);
      return result(formatStartEndValue(startDate, formatVariant, locale), userColor);
    }
    case 'endDay': {
      const endDate = resolveRangeEndpointDate('end', context, templateImage, weekStartsOn);
      if (!endDate) return result('', userColor);
      return result(formatStartEndValue(endDate, formatVariant, locale), userColor);
    }
    case 'weekNumber': {
      const weekDate = resolveWeekNumberDate(context, templateImage);
      if (!weekDate) return result('', userColor);
      return result(String(getWeekNumber(weekDate, weekStartsOn)), userColor);
    }
    case 'composite': {
      const anchor = resolveCompositeAnchorDate(context, templateImage);
      if (!anchor) return result('', userColor);
      const parts = resolveCompositeParts(rectangle);
      const value = parts
        .map(part => formatCompositePart(part, anchor, locale, weekStartsOn))
        .join('');
      return result(value, userColor);
    }
    default:
      return result('', userColor);
  }
}

/**
 * Render text onto a canvas at the specified rectangle position.
 * Supports multiline values separated by `\n`.
 */
export async function renderFieldOnCanvas(
  ctx: CanvasRenderingContext2D,
  rectangle: Rectangle,
  value: string,
  color: string,
  scaleX: number = 1,
  scaleY: number = 1
): Promise<void> {
  const x = rectangle.x * scaleX;
  const y = rectangle.y * scaleY;
  const width = rectangle.width * scaleX;
  const height = rectangle.height * scaleY;

  const lines = value.length > 0 ? value.split('\n') : [''];
  const lineCount = Math.max(1, lines.length);
  const paddingY = rectangle.height * 0.15;
  const availableHeight = (rectangle.height - paddingY * 2) * scaleY;
  const fontSize = (availableHeight / lineCount) * 0.9;
  const style = resolveFieldStyle(rectangle);
  const fontString = buildCanvasFont(style, fontSize);
  const lineHeight = availableHeight / lineCount;

  ctx.save();
  await document.fonts.load(fontString);

  const rotation = rectangle.rotation ?? 0;
  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(degToRad(rotation));
    ctx.translate(-cx, -cy);
  }

  ctx.font = fontString;
  ctx.textAlign = style.textAlign;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;

  const textX = resolveCanvasTextX(x, width, style.textAlign);
  const metrics = ctx.measureText('M');
  const blockTop = y + paddingY * scaleY;

  for (let i = 0; i < lines.length; i++) {
    const lineY = resolveCanvasTextY(blockTop + i * lineHeight, lineHeight, metrics);
    ctx.fillText(lines[i], textX, lineY, width * 0.9);
  }
  ctx.restore();
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Convert image file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Load an image from base64 or URL (canvas-safe for export).
 * Same-origin `/api/images/content` URLs fetch cleanly; CDN URLs may fail CORS.
 */
export async function loadImage(src: string): Promise<HTMLImageElement> {
  const resolvedSrc = await ensureDataUrl(src);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (isHttpUrl(resolvedSrc)) {
      img.crossOrigin = 'anonymous';
    }
    img.src = resolvedSrc;
  });
}
