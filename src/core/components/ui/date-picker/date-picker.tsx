import './date-picker.scss';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isAfter, isBefore, isSameMonth, startOfDay, startOfMonth } from 'date-fns';
import type { Locale } from 'date-fns';
import { cn } from '@/core/functions/cn';
import useOnClickOutside from '@/core/hooks/use-on-click-outside';

export type DatePickerGranularity = 'day' | 'month';

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  granularity: DatePickerGranularity;
  locale: Locale;
  weekStartsOn?: 0 | 1;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
  /** When true, render only the calendar/month panel (no trigger). */
  inline?: boolean;
  /** Horizontal alignment of the popover relative to the trigger. */
  align?: 'start' | 'end';
}

function clampToBounds(date: Date, minDate?: Date, maxDate?: Date): Date {
  let next = date;
  if (minDate && isBefore(next, minDate)) next = minDate;
  if (maxDate && isAfter(next, maxDate)) next = maxDate;
  return next;
}

function isMonthDisabled(monthDate: Date, minDate?: Date, maxDate?: Date): boolean {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  if (minDate && isAfter(startOfDay(minDate), monthEnd)) return true;
  if (maxDate && isBefore(startOfDay(maxDate), monthStart)) return true;
  return false;
}

function MonthYearPanel({
  value,
  onSelect,
  locale,
  minDate,
  maxDate,
}: {
  value: Date | null;
  onSelect: (date: Date) => void;
  locale: Locale;
  minDate?: Date;
  maxDate?: Date;
}) {
  const selected = value ?? new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());

  useEffect(() => {
    if (value && !Number.isNaN(value.getTime())) {
      setViewYear(value.getFullYear());
    }
  }, [value]);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => {
        const date = new Date(viewYear, month, 1);
        return {
          date,
          label: format(date, 'MMM', { locale }),
          disabled: isMonthDisabled(date, minDate, maxDate),
          selected: value ? isSameMonth(value, date) : false,
        };
      }),
    [viewYear, locale, minDate, maxDate, value],
  );

  const prevYearAllowed = !minDate || viewYear - 1 >= minDate.getFullYear();
  const nextYearAllowed = !maxDate || viewYear + 1 <= maxDate.getFullYear();

  return (
    <div className="date-picker__month-panel">
      <div className="date-picker__nav">
        <button
          type="button"
          className="date-picker__nav-btn"
          disabled={!prevYearAllowed}
          aria-label="Previous year"
          onClick={() => setViewYear(y => y - 1)}
        >
          <ChevronLeft size={16} strokeWidth={2.1} />
        </button>
        <span className="date-picker__nav-label">
          {format(new Date(viewYear, selected.getMonth(), 1), 'MMMM yyyy', { locale })}
        </span>
        <button
          type="button"
          className="date-picker__nav-btn"
          disabled={!nextYearAllowed}
          aria-label="Next year"
          onClick={() => setViewYear(y => y + 1)}
        >
          <ChevronRight size={16} strokeWidth={2.1} />
        </button>
      </div>
      <div className="date-picker__month-grid" role="listbox">
        {months.map(({ date, label, disabled, selected: isSelected }) => (
          <button
            key={date.getMonth()}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={disabled}
            className={cn(
              'date-picker__month-btn',
              isSelected && 'date-picker__month-btn--selected',
            )}
            onClick={() => {
              const next = clampToBounds(startOfMonth(date), minDate, maxDate);
              onSelect(startOfMonth(next));
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayPanel({
  value,
  onSelect,
  locale,
  weekStartsOn = 1,
  minDate,
  maxDate,
}: {
  value: Date | null;
  onSelect: (date: Date) => void;
  locale: Locale;
  weekStartsOn?: 0 | 1;
  minDate?: Date;
  maxDate?: Date;
}) {
  const disabledMatchers = useMemo(() => {
    const matchers: Array<{ before?: Date; after?: Date }> = [];
    if (minDate) matchers.push({ before: startOfDay(minDate) });
    if (maxDate) matchers.push({ after: startOfDay(maxDate) });
    return matchers;
  }, [minDate, maxDate]);

  return (
    <DayPicker
      mode="single"
      selected={value ?? undefined}
      onSelect={date => {
        if (!date) return;
        onSelect(clampToBounds(startOfDay(date), minDate, maxDate));
      }}
      locale={locale}
      weekStartsOn={weekStartsOn}
      disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
      defaultMonth={value ?? minDate ?? new Date()}
      className="date-picker__day-panel"
      classNames={{
        root: 'date-picker__rdp',
        months: 'date-picker__rdp-months',
        month: 'date-picker__rdp-month',
        month_caption: 'date-picker__rdp-caption',
        caption_label: 'date-picker__rdp-caption-label',
        nav: 'date-picker__rdp-nav',
        button_previous: 'date-picker__nav-btn',
        button_next: 'date-picker__nav-btn',
        weekdays: 'date-picker__rdp-weekdays',
        weekday: 'date-picker__rdp-weekday',
        week: 'date-picker__rdp-week',
        day: 'date-picker__rdp-day',
        day_button: 'date-picker__rdp-day-btn',
        selected: 'date-picker__rdp-selected',
        today: 'date-picker__rdp-today',
        outside: 'date-picker__rdp-outside',
        disabled: 'date-picker__rdp-disabled',
        hidden: 'date-picker__rdp-hidden',
        chevron: 'date-picker__rdp-chevron',
      }}
    />
  );
}

export function DatePickerPanel({
  value,
  onChange,
  granularity,
  locale,
  weekStartsOn = 1,
  minDate,
  maxDate,
}: Omit<DatePickerProps, 'label' | 'aria-label' | 'disabled' | 'className' | 'inline'>) {
  if (granularity === 'month') {
    return (
      <MonthYearPanel
        value={value}
        onSelect={onChange}
        locale={locale}
        minDate={minDate}
        maxDate={maxDate}
      />
    );
  }

  return (
    <DayPanel
      value={value}
      onSelect={onChange}
      locale={locale}
      weekStartsOn={weekStartsOn}
      minDate={minDate}
      maxDate={maxDate}
    />
  );
}

function formatTriggerValue(
  value: Date | null,
  granularity: DatePickerGranularity,
  locale: Locale,
): string {
  if (!value || Number.isNaN(value.getTime())) return '—';
  if (granularity === 'month') {
    return format(value, 'MMMM yyyy', { locale });
  }
  return format(value, 'd MMM yyyy', { locale });
}

export function DatePicker({
  value,
  onChange,
  granularity,
  locale,
  weekStartsOn = 1,
  minDate,
  maxDate,
  label,
  'aria-label': ariaLabel,
  disabled = false,
  className,
  inline = false,
  align = 'start',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(rootRef, () => setOpen(false));

  const handleSelect = (date: Date) => {
    const next =
      granularity === 'month'
        ? startOfMonth(clampToBounds(date, minDate, maxDate))
        : startOfDay(clampToBounds(date, minDate, maxDate));
    onChange(next);
    setOpen(false);
  };

  if (inline) {
    return (
      <div className={cn('date-picker', 'date-picker--inline', className)}>
        {label ? <span className="date-picker__field-label">{label}</span> : null}
        <DatePickerPanel
          value={value}
          onChange={handleSelect}
          granularity={granularity}
          locale={locale}
          weekStartsOn={weekStartsOn}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    );
  }

  return (
    <div className={cn('date-picker', className)} ref={rootRef}>
      {label ? <span className="date-picker__field-label">{label}</span> : null}
      <button
        type="button"
        className={cn('date-picker__trigger', open && 'date-picker__trigger--open')}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel ?? label}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="date-picker__trigger-value">
          {formatTriggerValue(value, granularity, locale)}
        </span>
        <CalendarDays
          size={15}
          strokeWidth={2}
          className="date-picker__trigger-icon"
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={cn(
            'date-picker__popover',
            align === 'end' && 'date-picker__popover--end',
          )}
          role="dialog"
        >
          <DatePickerPanel
            value={value}
            onChange={handleSelect}
            granularity={granularity}
            locale={locale}
            weekStartsOn={weekStartsOn}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      ) : null}
    </div>
  );
}

