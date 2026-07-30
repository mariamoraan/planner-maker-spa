import React, { useCallback, useMemo } from 'react';
import { Download, FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTemplateStore } from '@/stores/template-store';
import { useExportStore } from '@/stores/export-store';
import { estimatePageCount } from '@/lib/planner-export';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import './planner-generator-dialog.scss';

export const GeneratorDialog: React.FC = () => {
  const { t } = useTranslation();
  const { updateTemplate } = useTemplateStore();
  const template = useCurrentTemplate();
  const startDate: Date = template?.startDate ?? new Date();
  const endDate: Date = template?.endDate ?? new Date();

  const isGeneratorOpen = useTemplateStore(state => state.isGeneratorOpen);
  const setIsGeneratorOpen = useTemplateStore(state => state.setIsGeneratorOpen);
  const closeGenerator = useTemplateStore(state => state.closeGenerator);
  const startExport = useExportStore(state => state.startExport);
  const exportStatus = useExportStore(state => state.status);

  const estimatedPages = useMemo(() => {
    if (!template) return 0;
    return estimatePageCount(template, startDate, endDate);
  }, [template, startDate, endDate]);

  const handleDownload = useCallback(() => {
    if (!template) return;
    startExport(template, startDate, endDate);
    closeGenerator();
  }, [template, startDate, endDate, startExport, closeGenerator]);

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
                views={['month', 'year']}
                value={dayjs(startDate)}
                onChange={(newValue) => {
                  if (!newValue) return;
                  updateTemplate(template.id, { startDate: new Date(newValue.toISOString()) });
                }}
                slotProps={{
                  popper: {
                    disablePortal: true,
                  },
                }}
              />
            </div>

            <div className="planner-generator-dialog__field">
              <Label>{t('generator.endDate')}</Label>
              <DatePicker
                views={['month', 'year']}
                value={dayjs(endDate)}
                onChange={(newValue) => {
                  if (!newValue) return;
                  updateTemplate(template.id, { endDate: new Date(newValue.toISOString()) });
                }}
                slotProps={{
                  popper: {
                    disablePortal: true,
                  },
                }}
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
