import { 
  format, 
} from 'date-fns';
import type { Locale } from 'date-fns';
import type { Rectangle, FieldType, TemplateImage } from '@/types/planner';
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
import { DEFAULT_LOCALE, formatMonthName, formatWeekdayName } from '@/lib/locale-config';

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

export function getMonthDatesStartingOnMonday({
  year, 
  month
}: {
  year: number,
  month: number
}): Date[] {
  const dates:Date[] = [];

  // Día 1 del mes actual
  const firstDayOfMonth = new Date(year, month, 1);

  // Convertimos getDay() para que lunes = 0, domingo = 6
  const weekday = (firstDayOfMonth.getDay() + 6) % 7;

  // Calculamos la fecha del lunes inicial (puede ser del mes anterior)
  const startDate = new Date(year, month, 1 - weekday);

  // Número de días del mes actual
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Total de días a generar (días previos del mes anterior + días del mes actual)
  const totalDays = weekday + daysInMonth;

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }

  return dates;
}

export function getDaysOfMonth({ year, month }: { year: number; month: number }): Date[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: Date[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day));
  }

  return dates;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));

  // Jueves de esta semana decide el año
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    (((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7
  );

  return weekNumber;
}


function getCalendarWeeks({year, month}: {year: number, month: number}): WeekData[] {
  const weeks: WeekData[] = [];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Ajustar al lunes anterior (o el mismo)
  const start = new Date(firstDayOfMonth);
  const startDay = start.getDay() === 0 ? 7 : start.getDay();
  start.setDate(start.getDate() - (startDay - 1));

  // Ajustar al domingo posterior (o el mismo)
  const end = new Date(lastDayOfMonth);
  const endDay = end.getDay() === 0 ? 7 : end.getDay();
  end.setDate(end.getDate() + (7 - endDay));

  let current = new Date(start);

  while (current <= end) {
    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    weeks.push({
      weekNumber: getISOWeekNumber(days[0]),
      startDate: days[0],
      endDate: days[6],
      days,
    });
  }

  return weeks;
}


export function getMonthsBetween({startDate, endDate}: {startDate: Date, endDate: Date}): MonthData[] {
  const months: MonthData[] = [];
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth();

    const monthDates = getMonthDatesStartingOnMonday({year, month});
    const weeks = getCalendarWeeks({year, month});

    months.push({
      year,
      month,
      name: current.toLocaleString("default", { month: "long" }),
      weeks,
      days: monthDates
    });

    // Avanzamos un mes
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const normalizedDay = day === 0 ? 7 : day;

  const monday = new Date(d);
  monday.setDate(d.getDate() - (normalizedDay - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { monday, sunday };
}

export function getEditorPreviewContext(templateImage: TemplateImage): {
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
      return { year, month, days: getMonthDatesStartingOnMonday({ year, month }) };
    case 'weekly-calendar': {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(firstOfMonth);
        d.setDate(firstOfMonth.getDate() + i);
        return d;
      });
      return {
        year,
        month,
        week: {
          weekNumber: 1,
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
