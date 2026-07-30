import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';

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
