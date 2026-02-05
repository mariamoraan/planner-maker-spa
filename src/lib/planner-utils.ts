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

function groupDatesIntoWeeks(dates: Date[]): WeekData[] {
  const weeks: WeekData[] = [];
  let weekNumber = 1;

  for (let i = 0; i < dates.length; i += 7) {
    const weekDays = dates.slice(i, i + 7);
    weeks.push({
      weekNumber: weekNumber++,
      startDate: weekDays[0],
      endDate: weekDays[weekDays.length - 1],
      days: weekDays,
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
    const weeks = groupDatesIntoWeeks(monthDates);

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
export function getFieldValue({
  fieldType,
  context,
  templateImage,
  rectangle
}: {
  fieldType: FieldType,
  context: {
    year?: number;
    month?: number;
    week?: WeekData;
    days?: Date[];
  },
  templateImage: TemplateImage,
  rectangle: Rectangle
}): string {
  switch (fieldType) {
    case 'year':
      return context.year?.toString() ?? '';
    case 'month':
      return context.month !== undefined ? MONTH_NAMES[context.month] : '';
    case 'day':
      if (context.week) {
        const dayRectangles = templateImage.rectangles.filter(rect => rect.fieldType === 'day').sort((a, b) => a.order - b.order );

        const index = dayRectangles.indexOf(rectangle);
        if (index >= 0 && index < context.week.days.length) {
          const day = context.week.days[index];
          if (day.getMonth() === context.month) { // Only show if in current month
            return format(day, 'd')
          }
        }
      }
      if (context.days) {
        const dayRectangles = templateImage.rectangles.filter(rect => rect.fieldType === 'day').sort((a, b) => a.order - b.order );

        const index = dayRectangles.indexOf(rectangle);
        if (index >= 0 && index < context.days.length) {
          const day = context.days[index];
          if (day.getMonth() === context.month) { // Only show if in current month
            return format(day, 'd')
          }
        }
      }
      return '';
    case 'startDay':
      if(context.week) {
        const filteredDays = context.week.days;
        const {monday} = getWeekRange(filteredDays[0])
        return format(monday, 'd')
      }
      return '';
    case 'endDay':
      if(context.week) {
        const filteredDays = context.week.days;
       const {sunday} = getWeekRange(filteredDays[0])
        return format(sunday, 'd')
      }
      return '';
    default:
      return '';
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
