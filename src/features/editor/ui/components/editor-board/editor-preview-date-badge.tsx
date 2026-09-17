import './editor-preview-date-badge.scss';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { getEditorPreviewDateInfo } from '@/features/editor/domain/services/planner-utils';
import { resolveLocale, DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import useOnClickOutside from '@/core/hooks/use-on-click-outside';
import type { TemplateImage } from '@/features/template';

const DETAIL_KEYS: Record<string, string> = {
  previewMonthAligned: 'editor.previewDateMonthHint',
  previewMonthCustom: 'editor.previewDateMonthCustomHint',
  previewWeek: 'editor.previewDateWeekHint',
  previewWeekCustom: 'editor.previewDateWeekCustomHint',
  previewDayAligned: 'editor.previewDateDayHint',
  previewDayCustom: 'editor.previewDateDayCustomHint',
  previewPlannerRange: 'editor.previewDatePlannerHint',
};

type PickerMode = 'month' | 'date' | 'none';

function pickerModeForPage(type: TemplateImage['type']): PickerMode {
  switch (type) {
    case 'monthly-calendar':
    case 'month-cover':
      return 'month';
    case 'weekly-calendar':
    case 'daily-page':
      return 'date';
    default:
      return 'none';
  }
}

function toMonthInputValue(date: Date): string {
  return format(date, 'yyyy-MM');
}

function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function parseMonthInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return new Date(year, month, 1);
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function EditorPreviewDateBadge() {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const previewAnchorDate = useEditorStore(state => state.previewAnchorDate);
  const setPreviewAnchorDate = useEditorStore(state => state.setPreviewAnchorDate);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(rootRef, () => setOpen(false));

  if (!currentImage) return null;

  const locale = resolveLocale(template?.locale ?? 'es');
  const weekStartsOn = template?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;
  const info = getEditorPreviewDateInfo(
    currentImage,
    weekStartsOn,
    { plannerStart: template?.startDate, plannerEnd: template?.endDate },
    locale,
    previewAnchorDate,
  );

  const mode = pickerModeForPage(currentImage.type);
  const canPick = mode !== 'none';
  const hintKey = DETAIL_KEYS[info.detail];
  const title = canPick
    ? t('editor.previewDateChange')
    : hintKey
      ? t(hintKey)
      : info.label;

  const handleMonthChange = (value: string) => {
    const parsed = parseMonthInput(value);
    if (parsed) setPreviewAnchorDate(parsed);
  };

  const handleDateChange = (value: string) => {
    const parsed = parseDateInput(value);
    if (parsed) setPreviewAnchorDate(parsed);
  };

  const handleReset = () => {
    setPreviewAnchorDate(null);
    setOpen(false);
  };

  return (
    <div
      className="editor-preview-date-badge"
      ref={rootRef}
      {...blockSelectionZoneProps}
    >
      <button
        type="button"
        className="editor-preview-date-badge__trigger"
        title={title}
        aria-expanded={canPick ? open : undefined}
        aria-haspopup={canPick ? 'dialog' : undefined}
        disabled={!canPick}
        onClick={() => {
          if (canPick) setOpen(prev => !prev);
        }}
      >
        <span className="editor-preview-date-badge__row">
          <CalendarDays size={13} strokeWidth={2.1} aria-hidden />
          <span className="editor-preview-date-badge__prefix">
            {t('editor.previewDateLabel')}
          </span>
          {canPick ? (
            <ChevronDown
              size={12}
              strokeWidth={2.2}
              className="editor-preview-date-badge__chevron"
              aria-hidden
            />
          ) : null}
        </span>
        <span className="editor-preview-date-badge__value">{info.label}</span>
      </button>

      {open && canPick ? (
        <div className="editor-preview-date-badge__popover" role="dialog">
          <p className="editor-preview-date-badge__popover-title">
            {mode === 'month'
              ? t('editor.previewDatePickMonth')
              : currentImage.type === 'weekly-calendar'
                ? t('editor.previewDatePickWeek')
                : t('editor.previewDatePickDay')}
          </p>
          {mode === 'month' ? (
            <input
              type="month"
              className="editor-preview-date-badge__input"
              value={toMonthInputValue(info.anchor)}
              onChange={e => handleMonthChange(e.target.value)}
              aria-label={t('editor.previewDatePickMonth')}
            />
          ) : (
            <input
              type="date"
              className="editor-preview-date-badge__input"
              value={toDateInputValue(info.anchor)}
              onChange={e => handleDateChange(e.target.value)}
              aria-label={
                currentImage.type === 'weekly-calendar'
                  ? t('editor.previewDatePickWeek')
                  : t('editor.previewDatePickDay')
              }
            />
          )}
          {info.isCustom ? (
            <button
              type="button"
              className="editor-preview-date-badge__reset"
              onClick={handleReset}
            >
              {t('editor.previewDateReset')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
