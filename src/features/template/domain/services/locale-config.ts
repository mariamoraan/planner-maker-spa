import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { WeekStartsOn } from '@/features/template';

export type PlannerLocaleCode = 'en' | 'es';

export const LOCALE_MAP: Record<PlannerLocaleCode, Locale> = {
  en: enUS,
  es,
};

export const DEFAULT_LOCALE: Locale = es;

export function detectPlannerLocale(): PlannerLocaleCode {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es')) {
    return 'es';
  }
  return 'en';
}

export function resolveLocale(code: PlannerLocaleCode = 'es'): Locale {
  return LOCALE_MAP[code];
}

export function formatMonthName(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return format(date, 'MMMM', { locale });
}

export function formatWeekdayName(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return format(date, 'EEEE', { locale });
}

export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 'monday';

export function resolveWeekStartsOn(value?: WeekStartsOn): 0 | 1 {
  return value === 'sunday' ? 0 : 1;
}

const WEEKDAY_ABBREVS: Record<PlannerLocaleCode, Record<WeekStartsOn, { start: string; end: string }>> = {
  es: {
    monday: { start: 'LUN', end: 'DOM' },
    sunday: { start: 'DOM', end: 'SÁB' },
  },
  en: {
    monday: { start: 'MON', end: 'SUN' },
    sunday: { start: 'SUN', end: 'SAT' },
  },
};

export function getWeekDayAbbrevs(
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
  locale: PlannerLocaleCode = 'es'
): { start: string; end: string } {
  return WEEKDAY_ABBREVS[locale][weekStartsOn];
}
