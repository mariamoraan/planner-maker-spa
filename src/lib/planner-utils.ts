import { 
  format, 
} from 'date-fns';
import type {  Rectangle, FieldType, TemplateImage } from '@/types/planner';

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

/**
 * Get field value based on type and context
 */

const MAIN_COLOR = '#1f2a3d'
const SECONDARY_COLOR = '#929599'

export function getFieldValue({
  fieldType,
  context,
  templateImage,
  rectangle,
  fillIncompleteWeeks,
  fillIncompleteMonths
}: {
  fieldType: FieldType,
  context: {
    year?: number;
    month?: number;
    week?: WeekData;
    days?: Date[];
  },
  templateImage: TemplateImage,
  rectangle: Rectangle,
  fillIncompleteWeeks?: boolean;
  fillIncompleteMonths?: boolean;
}): {fieldValue: string, fieldColor: string} {
  switch (fieldType) {
    case 'year':
      return {fieldValue: context.year?.toString() ?? '', fieldColor: MAIN_COLOR};
    case 'month':
      return {fieldValue: context.month !== undefined ? MONTH_NAMES[context.month] : '', fieldColor: MAIN_COLOR};
    case 'day':
      if (context.week) {
        const dayRectangles = templateImage.rectangles.filter(rect => rect.fieldType === 'day').sort((a, b) => a.order - b.order );

        const index = dayRectangles.indexOf(rectangle);
        if (index >= 0 && index < context.week.days.length) {
          const day = context.week.days[index];
          const isDayInCurrentMonth = day.getMonth() === context.month;
          if(fillIncompleteWeeks) {
            return {fieldValue: format(day, 'd'), fieldColor: isDayInCurrentMonth ? MAIN_COLOR : SECONDARY_COLOR }
          }
          else if (isDayInCurrentMonth) { // Only show if in current month
            return {fieldValue: format(day, 'd'), fieldColor: MAIN_COLOR}
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
             return {fieldValue: format(day, 'd'), fieldColor: isDayInCurrentMonth ? MAIN_COLOR : SECONDARY_COLOR}
          }
          else if (isDayInCurrentMonth) { // Only show if in current month
            return {fieldValue: format(day, 'd'), fieldColor: MAIN_COLOR}
          }
        }
      }
      return {fieldValue: '', fieldColor: MAIN_COLOR};
    case 'startDay':
      if(context.week) {
        const filteredDays = context.week.days;
        const startDate = filteredDays[0];
        return {fieldValue: format(startDate, 'd'), fieldColor: MAIN_COLOR}
      }
      return {fieldValue: '', fieldColor: MAIN_COLOR};
    case 'endDay':
      if(context.week) {
        const filteredDays = context.week.days;
        const endDate = filteredDays.at(-1);
        return {fieldValue: format(endDate, 'd'), fieldColor: MAIN_COLOR}
      }
      return {fieldValue: '', fieldColor: MAIN_COLOR};
    default:
      return {fieldValue: '', fieldColor: MAIN_COLOR};
  }
}

/**
 * Render text onto a canvas at the specified rectangle position
 */
export async function renderFieldOnCanvas(
  ctx: CanvasRenderingContext2D,
  rectangle: Rectangle,
  value: string,
  scaleX: number = 1,
  scaleY: number = 1
): Promise<void> {
  const x = rectangle.x * scaleX;
  const y = rectangle.y * scaleY;
  const width = rectangle.width * scaleX;
  const height = rectangle.height * scaleY;
  
  // Calculate font size based on rectangle height
  const paddingY = rectangle.height * 0.15; // respiración vertical
  const fontSize = rectangle.height - paddingY * 2;
  const fontName = `"Gloria Hallelujah"`
  
  ctx.save();
  await document.fonts.load(`normal ${fontSize}px ${fontName}`);
  ctx.font = `normal ${fontSize}px ${fontName}, system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1e293b';
  
  // Draw the text centered in the rectangle
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
