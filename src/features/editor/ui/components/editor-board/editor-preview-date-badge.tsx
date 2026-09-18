import './editor-preview-date-badge.scss';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { startOfMonth } from 'date-fns';
import { DatePicker } from '@/core/components/ui/date-picker';
import { getEditorPreviewDateInfo, normalizePreviewPlannerRange } from '@/features/editor/domain/services/planner-utils';
import {
  resolveLocale,
  resolveWeekStartsOn,
  DEFAULT_WEEK_STARTS_ON,
} from '@/features/template/domain/services/locale-config';
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
  previewPlannerRangeCustom: 'editor.previewDatePlannerCustomHint',
};

type PickerMode = 'month' | 'date' | 'range' | 'none';

function pickerModeForPage(type: TemplateImage['type']): PickerMode {
  switch (type) {
    case 'monthly-calendar':
    case 'month-cover':
      return 'month';
    case 'weekly-calendar':
    case 'daily-page':
      return 'date';
    case 'cover':
    case 'extra':
      return 'range';
    default:
      return 'none';
  }
}

export function EditorPreviewDateBadge() {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const previewAnchorDate = useEditorStore(state => state.previewAnchorDate);
  const setPreviewAnchorDate = useEditorStore(state => state.setPreviewAnchorDate);
  const previewPlannerRange = useEditorStore(state => state.previewPlannerRange);
  const setPreviewPlannerRange = useEditorStore(state => state.setPreviewPlannerRange);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(rootRef, () => setOpen(false));

  if (!currentImage) return null;

  const locale = resolveLocale(template?.locale ?? 'es');
  const weekStartsOn = template?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;
  const weekStartsOnNumber = resolveWeekStartsOn(weekStartsOn);
  const templateStart = template?.startDate ?? new Date(new Date().getFullYear(), 0, 1);
  const templateEnd = template?.endDate ?? new Date(new Date().getFullYear(), 11, 31);
  const info = getEditorPreviewDateInfo(
    currentImage,
    weekStartsOn,
    { plannerStart: templateStart, plannerEnd: templateEnd },
    locale,
    previewAnchorDate,
    previewPlannerRange,
  );

  const mode = pickerModeForPage(currentImage.type);
  const canPick = mode !== 'none';
  const hintKey = DETAIL_KEYS[info.detail];
  const title = canPick
    ? t('editor.previewDateChange')
    : hintKey
      ? t(hintKey)
      : info.label;

  const effectiveOverride = normalizePreviewPlannerRange(previewPlannerRange);
  const displayRangeStart = effectiveOverride?.start
    ?? (currentImage.type === 'cover' || currentImage.type === 'extra'
      ? templateStart
      : info.anchor);
  const displayRangeEnd = effectiveOverride?.end
    ?? (currentImage.type === 'cover' || currentImage.type === 'extra'
      ? templateEnd
      : info.anchor);

  const handleAnchorChange = (date: Date) => {
    setPreviewAnchorDate(date);
  };

  const handleRangeStartChange = (date: Date) => {
    const end = startOfMonth(effectiveOverride?.end ?? displayRangeEnd);
    setPreviewPlannerRange(
      normalizePreviewPlannerRange({ start: startOfMonth(date), end }),
    );
  };

  const handleRangeEndChange = (date: Date) => {
    const start = startOfMonth(effectiveOverride?.start ?? displayRangeStart);
    setPreviewPlannerRange(
      normalizePreviewPlannerRange({ start, end: startOfMonth(date) }),
    );
  };

  const handleReset = () => {
    if (mode === 'range') {
      setPreviewPlannerRange(null);
    } else {
      setPreviewAnchorDate(null);
    }
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
          {mode === 'range' ? (
            <>
              <DatePicker
                granularity="month"
                value={startOfMonth(displayRangeStart)}
                onChange={handleRangeStartChange}
                locale={locale}
                weekStartsOn={weekStartsOnNumber}
                maxDate={startOfMonth(displayRangeEnd)}
                label={t('editor.previewDatePickRangeStart')}
                aria-label={t('editor.previewDatePickRangeStart')}
              />
              <DatePicker
                granularity="month"
                value={startOfMonth(displayRangeEnd)}
                onChange={handleRangeEndChange}
                locale={locale}
                weekStartsOn={weekStartsOnNumber}
                minDate={startOfMonth(displayRangeStart)}
                label={t('editor.previewDatePickRangeEnd')}
                aria-label={t('editor.previewDatePickRangeEnd')}
                align="end"
              />
            </>
          ) : (
            <>
              <p className="editor-preview-date-badge__popover-title">
                {mode === 'month'
                  ? t('editor.previewDatePickMonth')
                  : currentImage.type === 'weekly-calendar'
                    ? t('editor.previewDatePickWeek')
                    : t('editor.previewDatePickDay')}
              </p>
              <DatePicker
                inline
                granularity={mode === 'month' ? 'month' : 'day'}
                value={info.anchor}
                onChange={handleAnchorChange}
                locale={locale}
                weekStartsOn={weekStartsOnNumber}
                aria-label={
                  mode === 'month'
                    ? t('editor.previewDatePickMonth')
                    : currentImage.type === 'weekly-calendar'
                      ? t('editor.previewDatePickWeek')
                      : t('editor.previewDatePickDay')
                }
              />
            </>
          )}
          {info.isCustom ? (
            <button
              type="button"
              className="editor-preview-date-badge__reset"
              onClick={handleReset}
            >
              {mode === 'range'
                ? t('editor.previewDateResetRange')
                : t('editor.previewDateReset')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
