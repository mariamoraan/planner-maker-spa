import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  getISOWeek,
  getWeek,
} from 'date-fns';
import type { Locale } from 'date-fns';
import type { Rectangle, FieldType, TemplateImage, WeekStartsOn } from '@/types/planner';
import {
  SECONDARY_COLOR,
  getFormatVariant,
  resolveFieldStyle,
  buildCanvasFont,
  formatFieldValue,
  isYearFormatVariant,
  isMonthFormatVariant,
  isDayFormatVariant,
} from '@/lib/field-style-config';
import {
  DEFAULT_LOCALE,
  DEFAULT_WEEK_STARTS_ON,
  formatMonthName,
  formatWeekdayName,
  resolveWeekStartsOn,
} from '@/lib/locale-config';

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

function getWeekNumber(date: Date, weekStartsOn: WeekStartsOn): number {
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
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON
): {
  year?: number;
  month?: number;
  week?: WeekData;
  days?: Date[];
  date?: Date;
} {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1);

  switch (templateImage.type) {
    case 'daily-page':
      return { date: firstOfMonth, year, month };
    case 'month-cover':
      return { year, month };
    case 'monthly-calendar':
      return { year, month, days: getMonthDatesForGrid({ year, month, weekStartsOn }) };
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
      };
    }
    default:
      return { year, month, date: firstOfMonth };
  }
}

/**
 * Get field value based on type and context
 */

function formatYearValue(date: Date, formatVariant: ReturnType<typeof getFormatVariant>): string {
  if (isYearFormatVariant(formatVariant)) {
    return formatVariant === 'YY' ? format(date, 'yy') : format(date, 'yyyy');
  }
  return format(date, 'yyyy');
}

function formatMonthValue(date: Date, formatVariant: ReturnType<typeof getFormatVariant>, locale: Locale): string {
  if (isMonthFormatVariant(formatVariant)) {
    return formatVariant === 'numeric'
      ? format(date, 'M')
      : formatMonthName(date, locale);
  }
  return formatMonthName(date, locale);
}

function formatDayValue(date: Date, formatVariant: ReturnType<typeof getFormatVariant>, locale: Locale): string {
  if (isDayFormatVariant(formatVariant)) {
    return formatVariant === 'numeric'
      ? format(date, 'd')
      : formatWeekdayName(date, locale);
  }
  return format(date, 'd');
}

function resolveFieldColor(isInCurrentMonth: boolean, userColor: string): string {
  return isInCurrentMonth ? userColor : SECONDARY_COLOR;
}

export function getFieldValue({
  fieldType,
  context,
  templateImage,
  rectangle,
  fillIncompleteWeeks,
  fillIncompleteMonths,
  locale = DEFAULT_LOCALE,
}: {
  fieldType: FieldType,
  context: {
    year?: number;
    month?: number;
    week?: WeekData;
    days?: Date[];
    date?: Date;
  },
  templateImage: TemplateImage,
  rectangle: Rectangle,
  fillIncompleteWeeks?: boolean;
  fillIncompleteMonths?: boolean;
  locale?: Locale;
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
    case 'startDay':
      if(context.week) {
        const filteredDays = context.week.days;
        const startDate = filteredDays[0];
        return result(formatDayValue(startDate, formatVariant, locale), userColor);
      }
      return result('', userColor);
    case 'endDay':
      if(context.week) {
        const filteredDays = context.week.days;
        const endDate = filteredDays.at(-1);
        if (!endDate) return result('', userColor);
        return result(formatDayValue(endDate, formatVariant, locale), userColor);
      }
      return result('', userColor);
    default:
      return result('', userColor);
  }
}

/**
 * Render text onto a canvas at the specified rectangle position
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

  const paddingY = rectangle.height * 0.15;
  const fontSize = (rectangle.height - paddingY * 2) * scaleY;
  const style = resolveFieldStyle(rectangle);
  const fontString = buildCanvasFont(style, fontSize);

  ctx.save();
  await document.fonts.load(fontString);
  ctx.font = fontString;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;

  ctx.fillText(value, x + width / 2, y + height / 2, width * 0.9);
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
 * Load an image from base64 or URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
