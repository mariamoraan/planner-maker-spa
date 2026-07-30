import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export const DEFAULT_LOCALE: Locale = es;

export function formatMonthName(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return format(date, 'MMMM', { locale });
}

export function formatWeekdayName(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return format(date, 'EEEE', { locale });
}
