import { 
  eachMonthOfInterval, 
  eachWeekOfInterval, 
  format, 
  getWeek, 
  startOfMonth, 
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval
} from 'date-fns';
import type { PlannerConfig, Template, GeneratedPage, Rectangle, FieldType } from '@/types/planner';

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
}

export interface WeekData {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
}

/**
 * Generate all months in the date range
 */
export function getMonthsInRange(start: Date, end: Date): MonthData[] {
  const months = eachMonthOfInterval({ start, end });
  
  return months.map(monthDate => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const weeksInMonth = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 0 }
    );
    
    const weeks: WeekData[] = weeksInMonth.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return {
        weekNumber: getWeek(weekStart),
        startDate: weekStart,
        endDate: weekEnd,
        days,
      };
    });
    
    return {
      month: monthDate.getMonth(),
      year: monthDate.getFullYear(),
      name: MONTH_NAMES[monthDate.getMonth()],
      weeks,
    };
  });
}

/**
 * Get field value based on type and context
 */
export function getFieldValue(
  fieldType: FieldType,
  context: {
    year?: number;
    month?: number;
    week?: WeekData;
    day?: Date;
  }
): string {
  switch (fieldType) {
    case 'year':
      return context.year?.toString() ?? '';
    case 'month':
      return context.month !== undefined ? MONTH_NAMES[context.month] : '';
    case 'day':
      if (context.week) {
        const startDay = format(context.week.startDate, 'd');
        const endDay = format(context.week.endDate, 'd');
        return `${startDay} - ${endDay}`;
      }
      if (context.day) {
        return format(context.day, 'd');
      }
      return '';
    default:
      return '';
  }
}

/**
 * Render text onto a canvas at the specified rectangle position
 */
export function renderFieldOnCanvas(
  ctx: CanvasRenderingContext2D,
  rectangle: Rectangle,
  value: string,
  scaleX: number = 1,
  scaleY: number = 1
): void {
  const x = rectangle.x * scaleX;
  const y = rectangle.y * scaleY;
  const width = rectangle.width * scaleX;
  const height = rectangle.height * scaleY;
  
  // Calculate font size based on rectangle height
  const fontSize = Math.min(height * 0.6, width * 0.15);
  
  ctx.save();
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
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
