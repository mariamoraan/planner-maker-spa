import './editor-preview-date-badge.scss';

import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { getEditorPreviewDateInfo } from '@/features/editor/domain/services/planner-utils';
import { resolveLocale, DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';

const DETAIL_KEYS: Record<string, string> = {
  previewMonthAligned: 'editor.previewDateMonthHint',
  previewWeek: 'editor.previewDateWeekHint',
  previewDayAligned: 'editor.previewDateDayHint',
  previewPlannerRange: 'editor.previewDatePlannerHint',
};

export function EditorPreviewDateBadge() {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();

  if (!currentImage) return null;

  const locale = resolveLocale(template?.locale ?? 'es');
  const info = getEditorPreviewDateInfo(
    currentImage,
    template?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON,
    { plannerStart: template?.startDate, plannerEnd: template?.endDate },
    locale,
  );

  const hintKey = DETAIL_KEYS[info.detail];
  const title = hintKey ? t(hintKey) : info.label;

  return (
    <div
      className="editor-preview-date-badge"
      title={title}
      {...blockSelectionZoneProps}
    >
      <CalendarDays size={13} strokeWidth={2.1} aria-hidden />
      <span className="editor-preview-date-badge__prefix">
        {t('editor.previewDateLabel')}
      </span>
      <span className="editor-preview-date-badge__value">{info.label}</span>
    </div>
  );
}
