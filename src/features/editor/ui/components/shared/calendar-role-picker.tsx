import './calendar-role-picker.scss';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, CalendarDays, CalendarRange, ChevronDown, FileText, LayoutGrid } from 'lucide-react';
import type { BindingSourceKind } from '@/features/template';
import {
  CALENDAR_ROLE_OPTIONS,
  calendarRoleLabelKey,
  calendarRoleOptionsForPage,
  calendarRoleShortKey,
} from '@/features/editor/domain/services/binding-group';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import clsx from 'clsx';
import type { TemplateType } from '@/features/template';

const ROLE_ICONS: Record<BindingSourceKind, typeof FileText> = {
  page: FileText,
  monthDays: CalendarDays,
  weekDays: CalendarRange,
  yearMonths: LayoutGrid,
};

interface CalendarRolePickerProps {
  /** Currently applied role — this is what stays highlighted. */
  value?: BindingSourceKind | null;
  /** Fallback highlight when creating a new group (no value yet). */
  suggested?: BindingSourceKind;
  onSelect: (source: BindingSourceKind) => void;
  className?: string;
  /**
   * `icon` — calendar icon only (multi-select “use as calendar”).
   * `button` — icon + short label of current value (block / grid toolbars).
   */
  variant?: 'icon' | 'button';
  /** Override trigger aria/title (defaults to “Fechas” / current role). */
  triggerTitle?: string;
  /** When set, filters role options for the page type (e.g. yearly omits week). */
  pageType?: TemplateType;
}

export function CalendarRolePicker({
  value,
  suggested,
  onSelect,
  className,
  variant = 'icon',
  triggerTitle,
  pageType,
}: CalendarRolePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = value ?? suggested ?? 'page';
  const ActiveIcon = ROLE_ICONS[active];
  const roleOptions = pageType
    ? calendarRoleOptionsForPage(pageType)
    : CALENDAR_ROLE_OPTIONS;

  const close = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition({ top: rect.bottom + 8, left: rect.left });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };

    const handleScrollOrResize = () => close();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const title =
    triggerTitle ??
    (value
      ? t(calendarRoleLabelKey(value))
      : t('editor.calendarUseAsCalendar'));

  return (
    <div
      className={clsx('calendar-role-picker', `calendar-role-picker--${variant}`, className)}
      {...blockSelectionZoneProps}
    >
      <button
        ref={triggerRef}
        type="button"
        className={clsx('calendar-role-picker__trigger', {
          'calendar-role-picker__trigger--open': isOpen,
          'calendar-role-picker__trigger--icon': variant === 'icon',
          'calendar-role-picker__trigger--button': variant === 'button',
        })}
        onClick={toggle}
        title={title}
        aria-label={title}
        aria-expanded={isOpen}
      >
        {variant === 'icon' ? (
          <Calendar size={16} strokeWidth={2.1} />
        ) : (
          <>
            <ActiveIcon size={15} strokeWidth={2.1} />
            <span className="calendar-role-picker__trigger-label">
              {t(calendarRoleShortKey(active))}
            </span>
            <ChevronDown size={14} strokeWidth={2} className="calendar-role-picker__chevron" />
          </>
        )}
      </button>
      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="calendar-role-picker__menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            {...blockSelectionZoneProps}
          >
            <p className="calendar-role-picker__title">
              {t('editor.calendarUseAsCalendarTitle')}
            </p>
            <div className="calendar-role-picker__options">
              {roleOptions.map(option => {
                const Icon = ROLE_ICONS[option];
                const isActive = option === active;
                return (
                  <button
                    key={option}
                    type="button"
                    className={clsx('calendar-role-picker__option', {
                      'calendar-role-picker__option--active': isActive,
                    })}
                    onClick={() => {
                      onSelect(option);
                    }}
                    title={t(calendarRoleLabelKey(option))}
                    aria-pressed={isActive}
                  >
                    <span className="calendar-role-picker__option-icon" aria-hidden>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="calendar-role-picker__option-text">
                      <span className="calendar-role-picker__option-label">
                        {t(calendarRoleShortKey(option))}
                      </span>
                      <span className="calendar-role-picker__option-hint">
                        {t(calendarRoleLabelKey(option))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
