import React, { useCallback, useMemo } from 'react';
import { Download, FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { startOfMonth } from 'date-fns';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Label } from '@/core/components/ui/label';
import { DatePicker } from '@/core/components/ui/date-picker';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useExportStore } from '@/features/export/ui/stores/export-store';
import { estimatePageCount } from '@/features/export/domain/services/planner-export';
import {
  resolveLocale,
  resolveWeekStartsOn,
  DEFAULT_WEEK_STARTS_ON,
} from '@/features/template/domain/services/locale-config';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import './planner-generator-dialog.scss';

export const GeneratorDialog: React.FC = () => {
  const { t } = useTranslation();
  const { updateTemplate } = useTemplateStore();
  const template = useCurrentTemplate();
  const startDate: Date = template?.startDate ?? new Date();
  const endDate: Date = template?.endDate ?? new Date();
  const locale = resolveLocale(template?.locale ?? 'es');
  const weekStartsOn = resolveWeekStartsOn(template?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON);

  const isGeneratorOpen = useExportStore(state => state.isGeneratorOpen);
  const setIsGeneratorOpen = useExportStore(state => state.setIsGeneratorOpen);
  const closeGenerator = useExportStore(state => state.closeGenerator);
  const startExport = useExportStore(state => state.startExport);
  const exportStatus = useExportStore(state => state.status);
  const includeInternalLinks = useExportStore(state => state.includeInternalLinks);
  const setIncludeInternalLinks = useExportStore(state => state.setIncludeInternalLinks);

  const estimatedPages = useMemo(() => {
    if (!template) return 0;
    return estimatePageCount(template, startDate, endDate);
  }, [template, startDate, endDate]);

  const handleDownload = useCallback(() => {
    if (!template) return;
    startExport(template, startDate, endDate, { includeInternalLinks });
    closeGenerator();
  }, [template, startDate, endDate, includeInternalLinks, startExport, closeGenerator]);

  if (!template) return null;

  const isExportRunning = exportStatus === 'running';

  return (
    <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
      <DialogContent className="dialog-content--wide">
        <DialogHeader>
          <DialogTitle>
            <span className="dialog-title-row">
              <FileDown className="planner-generator-dialog__icon planner-generator-dialog__icon--title" />
              {t('generator.title')}
            </span>
          </DialogTitle>
          <DialogDescription>
            {t('generator.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="planner-generator-dialog__body">
          <div className="planner-generator-dialog__date-grid">
            <div className="planner-generator-dialog__field">
              <Label>{t('generator.startDate')}</Label>
              <DatePicker
                granularity="month"
                value={startOfMonth(startDate)}
                onChange={date => {
                  updateTemplate(template.id, { startDate: startOfMonth(date) });
                }}
                locale={locale}
                weekStartsOn={weekStartsOn}
                maxDate={startOfMonth(endDate)}
                aria-label={t('generator.startDate')}
              />
            </div>

            <div className="planner-generator-dialog__field">
              <Label>{t('generator.endDate')}</Label>
              <DatePicker
                granularity="month"
                value={startOfMonth(endDate)}
                onChange={date => {
                  updateTemplate(template.id, { endDate: startOfMonth(date) });
                }}
                locale={locale}
                weekStartsOn={weekStartsOn}
                minDate={startOfMonth(startDate)}
                aria-label={t('generator.endDate')}
                align="end"
              />
            </div>
          </div>

          <div className="planner-generator-dialog__summary">
            <div className="planner-generator-dialog__summary-header">
              <div>
                <h4 className="planner-generator-dialog__summary-title">{template.name}</h4>
                <p className="planner-generator-dialog__summary-text">
                  {t('generator.pagesConfigured', { count: template.images.length })}
                </p>
              </div>
              <div className="planner-generator-dialog__estimate">
                <span className="planner-generator-dialog__estimate-value">{estimatedPages}</span>
                <span className="planner-generator-dialog__estimate-label">{t('generator.pagesEstimated')}</span>
              </div>
            </div>
          </div>

          <label className="planner-generator-dialog__checkbox">
            <input
              type="checkbox"
              checked={includeInternalLinks}
              onChange={event => setIncludeInternalLinks(event.target.checked)}
            />
            <span>
              <span className="planner-generator-dialog__checkbox-title">
                {t('generator.includeInternalLinks')}
              </span>
              <span className="planner-generator-dialog__checkbox-hint">
                {t('generator.includeInternalLinksHint')}
              </span>
            </span>
          </label>
        </div>

        <DialogFooter className="dialog-footer--gap">
          <Button variant="outline" onClick={closeGenerator}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={isExportRunning || estimatedPages === 0}
            title={isExportRunning ? t('editor.exportInProgress') : undefined}
          >
            <Download className="planner-generator-dialog__icon planner-generator-dialog__icon--margin-right" />
            {t('generator.downloadPdf')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
