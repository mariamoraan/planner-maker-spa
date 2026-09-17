import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  getISOWeek,
  getWeek,
  isSameMonth,
  isSameYear,
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
import {
  getSequenceIndex,
  resolveEffectiveBindingSource,
} from '@/features/editor/domain/services/binding-group';
import type { BindingSourceKind } from '@/features/template';

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

/**
 * Pick a nearby month whose day 1 falls on the planner's first weekday.
 * Keeps editor preview grids aligned: cell 0 = day 1 (no leading padding).
 */
export function findPreviewMonthAlignedToWeekStart(
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
  from: Date = new Date(),
): { year: number; month: number; firstOfMonth: Date } {
  const targetWeekday = resolveWeekStartsOn(weekStartsOn);

  for (let offset = 0; offset < 12; offset++) {
    const firstOfMonth = new Date(from.getFullYear(), from.getMonth() + offset, 1);
    if (firstOfMonth.getDay() === targetWeekday) {
      return {
        year: firstOfMonth.getFullYear(),
        month: firstOfMonth.getMonth(),
        firstOfMonth,
      };
    }
  }

  const fallback = new Date(from.getFullYear(), from.getMonth(), 1);
  return {
    year: fallback.getFullYear(),
    month: fallback.getMonth(),
    firstOfMonth: fallback,
  };
}

export function getEditorPreviewContext(
  templateImage: TemplateImage,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
  plannerRange?: { plannerStart?: Date; plannerEnd?: Date },
  previewAnchor?: Date | null,
): FieldValueContext {
  const today = new Date();
  const hasOverride = previewAnchor instanceof Date && !Number.isNaN(previewAnchor.getTime());
  const aligned = hasOverride
    ? {
        year: previewAnchor.getFullYear(),
        month: previewAnchor.getMonth(),
        firstOfMonth: new Date(previewAnchor.getFullYear(), previewAnchor.getMonth(), 1),
      }
    : findPreviewMonthAlignedToWeekStart(weekStartsOn, today);
  const { year, month, firstOfMonth } = aligned;
  const plannerStart = plannerRange?.plannerStart ?? new Date(today.getFullYear(), 0, 1);
  const plannerEnd = plannerRange?.plannerEnd ?? new Date(today.getFullYear(), 11, 31);

  switch (templateImage.type) {
    case 'daily-page': {
      const date = hasOverride ? previewAnchor : firstOfMonth;
      return {
        date,
        year: date.getFullYear(),
        month: date.getMonth(),
        plannerStart,
        plannerEnd,
      };
    }
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
      const weekAnchor = hasOverride ? previewAnchor : firstOfMonth;
      const weekStart = startOfWeek(weekAnchor, { weekStartsOn: weekStartOption });
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      return {
        year: weekStart.getFullYear(),
        month: weekStart.getMonth(),
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

export interface EditorPreviewDateInfo {
  /** Short label shown in the badge, e.g. "febrero 2027". */
  label: string;
  /** Longer explanation for title/tooltip. */
  detail: string;
  /** Anchor date used for preview (1st of preview month, week start, etc.). */
  anchor: Date;
  /** True when the user picked a custom preview date. */
  isCustom: boolean;
}

/**
 * Human-readable description of the date window used by the editor preview.
 * Helps users understand why they may see a future month (week-start alignment).
 */
export function getEditorPreviewDateInfo(
  templateImage: TemplateImage,
  weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON,
  plannerRange?: { plannerStart?: Date; plannerEnd?: Date },
  locale: Locale = DEFAULT_LOCALE,
  previewAnchor?: Date | null,
): EditorPreviewDateInfo {
  const isCustom =
    previewAnchor instanceof Date && !Number.isNaN(previewAnchor.getTime());
  const context = getEditorPreviewContext(
    templateImage,
    weekStartsOn,
    plannerRange,
    previewAnchor,
  );
  const capitalize = (value: string) =>
    value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  switch (templateImage.type) {
    case 'weekly-calendar': {
      const start = context.week?.startDate;
      const end = context.week?.endDate;
      if (!start || !end) {
        return { label: '—', detail: '', anchor: new Date(), isCustom };
      }
      let label: string;
      if (isSameMonth(start, end) && isSameYear(start, end)) {
        label = `${format(start, 'd', { locale })}–${format(end, 'd MMM', { locale })}`;
      } else if (isSameYear(start, end)) {
        label = `${format(start, 'd MMM', { locale })} – ${format(end, 'd MMM', { locale })}`;
      } else {
        label = `${format(start, 'd MMM', { locale })} – ${format(end, 'd MMM yyyy', { locale })}`;
      }
      return {
        label,
        detail: isCustom ? 'previewWeekCustom' : 'previewWeek',
        anchor: start,
        isCustom,
      };
    }
    case 'cover':
    case 'extra': {
      const start = context.plannerStart ?? new Date();
      const end = context.plannerEnd ?? start;
      const label = isSameYear(start, end)
        ? `${format(start, 'MMM', { locale })} – ${format(end, 'MMM yyyy', { locale })}`
        : `${format(start, 'MMM yyyy', { locale })} – ${format(end, 'MMM yyyy', { locale })}`;
      return {
        label,
        detail: 'previewPlannerRange',
        anchor: start,
        isCustom: false,
      };
    }
    case 'daily-page': {
      const date = context.date ?? new Date(context.year!, context.month!, 1);
      return {
        label: capitalize(format(date, 'd MMMM yyyy', { locale })),
        detail: isCustom ? 'previewDayCustom' : 'previewDayAligned',
        anchor: date,
        isCustom,
      };
    }
    case 'month-cover':
    case 'monthly-calendar':
    default: {
      const date = new Date(context.year!, context.month!, 1);
      return {
        label: capitalize(format(date, 'MMMM yyyy', { locale })),
        detail: isCustom ? 'previewMonthCustom' : 'previewMonthAligned',
        anchor: date,
        isCustom,
      };
    }
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

export interface ResolvedBindingDate {
  date: Date | null;
  referenceMonth: number | undefined;
  source: BindingSourceKind;
  sequenceIndex: number;
}

function resolveMonthDayList(
  context: FieldValueContext,
  weekStartsOn: WeekStartsOn,
): { dates: Date[]; referenceMonth: number } | null {
  if (context.days?.length) {
    const referenceMonth =
      context.month ??
      context.date?.getMonth() ??
      context.days[Math.min(15, context.days.length - 1)]?.getMonth() ??
      0;
    return { dates: context.days, referenceMonth };
  }

  const anchor =
    context.date ??
    (context.year !== undefined && context.month !== undefined
      ? new Date(context.year, context.month, 1)
      : null);
  if (!anchor) return null;

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  return {
    dates: getMonthDatesForGrid({ year, month, weekStartsOn }),
    referenceMonth: month,
  };
}

function resolveWeekDayList(
  context: FieldValueContext,
  weekStartsOn: WeekStartsOn,
): { dates: Date[]; referenceMonth: number } | null {
  if (context.week?.days?.length) {
    return {
      dates: context.week.days,
      referenceMonth: context.month ?? context.week.days[0]?.getMonth(),
    };
  }

  const anchor =
    context.date ??
    context.week?.startDate ??
    (context.year !== undefined && context.month !== undefined
      ? new Date(context.year, context.month, 1)
      : null);
  if (!anchor) return null;

  const weekStartOption = resolveWeekStartsOn(weekStartsOn);
  const weekStart = startOfWeek(anchor, { weekStartsOn: weekStartOption });
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return {
    dates,
    referenceMonth: context.month ?? anchor.getMonth(),
  };
}

/**
 * Resolve the date a rectangle should display from its binding group
 * (or implicit page anchor when unbound).
 */
export function resolveBindingDate({
  rectangle,
  templateImage,
  context,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
  endpoint,
}: {
  rectangle: Rectangle;
  templateImage: TemplateImage;
  context: FieldValueContext;
  weekStartsOn?: WeekStartsOn;
  endpoint?: 'start' | 'end';
}): ResolvedBindingDate {
  const source = resolveEffectiveBindingSource(rectangle, templateImage);
  const sequenceIndex = getSequenceIndex(rectangle, templateImage.rectangles);

  if (source === 'page') {
    if (endpoint) {
      return {
        date: resolveRangeEndpointDate(endpoint, context, templateImage, weekStartsOn),
        referenceMonth: context.month,
        source,
        sequenceIndex: 0,
      };
    }
    return {
      date: resolveCompositeAnchorDate(context, templateImage),
      referenceMonth: context.month,
      source,
      sequenceIndex: 0,
    };
  }

  const list =
    source === 'monthDays'
      ? resolveMonthDayList(context, weekStartsOn)
      : resolveWeekDayList(context, weekStartsOn);

  if (!list) {
    return {
      date: null,
      referenceMonth: context.month,
      source,
      sequenceIndex,
    };
  }

  if (endpoint === 'start') {
    return {
      date: list.dates[0] ?? null,
      referenceMonth: list.referenceMonth,
      source,
      sequenceIndex: 0,
    };
  }
  if (endpoint === 'end') {
    return {
      date: list.dates.at(-1) ?? null,
      referenceMonth: list.referenceMonth,
      source,
      sequenceIndex: Math.max(0, list.dates.length - 1),
    };
  }

  return {
    date: list.dates[sequenceIndex] ?? null,
    referenceMonth: list.referenceMonth,
    source,
    sequenceIndex,
  };
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
  const formatVariant = getFormatVariant(rectangle);
  const style = resolveFieldStyle(rectangle);
  const userColor = style.color;
  const localeCode = locale.code ?? 'es';

  const result = (fieldValue: string, fieldColor: string) => ({
    fieldValue: formatFieldValue(fieldValue, style, localeCode),
    fieldColor,
  });

  // Legacy unbound `day` sequencing (pre-bindingGroups) on monthly/weekly pages.
  if (
    fieldType === 'day' &&
    !rectangle.bindingGroupId &&
    !context.date &&
    (context.week || context.days)
  ) {
    const dayRectangles = templateImage.rectangles
      .filter(rect => rect.fieldType === 'day' && !rect.bindingGroupId)
      .sort((a, b) => a.order - b.order);
    const index = dayRectangles.findIndex(rect => rect.id === rectangle.id);
    const dayList = context.week?.days ?? context.days ?? [];
    if (index >= 0 && index < dayList.length) {
      const day = dayList[index];
      const isDayInCurrentMonth = day.getMonth() === context.month;
      const allowOutOfMonth = context.week
        ? Boolean(fillIncompleteWeeks)
        : Boolean(fillIncompleteMonths);
      if (!isDayInCurrentMonth && !allowOutOfMonth) {
        return result('', userColor);
      }
      return result(
        formatDayValue(day, formatVariant, locale),
        resolveFieldColor(isDayInCurrentMonth, userColor),
      );
    }
    return result('', userColor);
  }

  const endpoint =
    fieldType === 'startDay' ? 'start' : fieldType === 'endDay' ? 'end' : undefined;

  const resolved = resolveBindingDate({
    rectangle,
    templateImage,
    context,
    weekStartsOn,
    endpoint,
  });

  const date = resolved.date;
  if (!date) {
    return result('', userColor);
  }

  const isSequence = resolved.source === 'monthDays' || resolved.source === 'weekDays';
  const referenceMonth = resolved.referenceMonth;
  const isInCurrentMonth =
    referenceMonth === undefined || date.getMonth() === referenceMonth;
  const shouldMuteOutOfMonth = isSequence && !isInCurrentMonth;

  const allowOutOfMonth =
    resolved.source === 'weekDays'
      ? Boolean(fillIncompleteWeeks)
      : resolved.source === 'monthDays'
        ? Boolean(fillIncompleteMonths)
        : true;

  if (shouldMuteOutOfMonth && !allowOutOfMonth) {
    return result('', userColor);
  }

  const resolvedColor = shouldMuteOutOfMonth
    ? resolveFieldColor(false, userColor)
    : userColor;

  switch (fieldType) {
    case 'year':
      return result(formatYearValue(date, formatVariant), resolvedColor);
    case 'month':
      return result(formatMonthValue(date, formatVariant, locale), resolvedColor);
    case 'day':
      return result(formatDayValue(date, formatVariant, locale), resolvedColor);
    case 'startDay':
    case 'endDay':
      return result(formatStartEndValue(date, formatVariant, locale), resolvedColor);
    case 'weekNumber':
      return result(String(getWeekNumber(date, weekStartsOn)), resolvedColor);
    case 'composite': {
      const parts = resolveCompositeParts(rectangle);
      const value = parts
        .map(part => formatCompositePart(part, date, locale, weekStartsOn))
        .join('');
      return result(value, resolvedColor);
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
