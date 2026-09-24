import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Loader2, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/core/components/ui/button';
import { pageTypeLabelKey } from '@/features/template/domain/constants/field-type-config';
import type { TemplateType } from '@/features/template';
import {
  useExportStore,
  type ExportPageType,
  type ExportPhase,
  type ExportPdfStep,
} from '@/features/export/ui/stores/export-store';
import './export-progress-card.scss';

function isTemplateType(pageType: ExportPageType): pageType is TemplateType {
  return pageType !== 'blank';
}

function resolvePhaseLabelKey(phase: ExportPhase, pdfStep?: ExportPdfStep): string {
  if (phase === 'pdf' && pdfStep) {
    return `exportProgress.pdfSteps.${pdfStep}`;
  }
  return `exportProgress.phases.${phase}`;
}

export const ExportProgressCard: React.FC = () => {
  const { t } = useTranslation();
  const status = useExportStore(state => state.status);
  const progress = useExportStore(state => state.progress);
  const phase = useExportStore(state => state.phase);
  const progressDetail = useExportStore(state => state.progressDetail);
  const fileName = useExportStore(state => state.fileName);
  const error = useExportStore(state => state.error);
  const dismiss = useExportStore(state => state.dismiss);
  const openPdf = useExportStore(state => state.openPdf);
  const retryExport = useExportStore(state => state.retryExport);

  const displayProgress = Math.min(100, Math.max(0, progress));
  const isVisible = status === 'running' || status === 'complete' || status === 'error';

  const phaseLabel = phase
    ? t(resolvePhaseLabelKey(phase, progressDetail?.pdfStep))
    : t('exportProgress.phases.preparing');

  const pageTypeLabel = (() => {
    const pageType = progressDetail?.pageType;
    if (!pageType) return null;
    if (pageType === 'blank') return t('exportProgress.pageTypes.blank');
    if (isTemplateType(pageType)) return t(pageTypeLabelKey(pageType));
    return null;
  })();

  const pagesLabel =
    progressDetail && progressDetail.total > 0
      ? t('exportProgress.pagesOf', {
          current: progressDetail.current,
          total: progressDetail.total,
        })
      : null;

  const detailText = (() => {
    if (!phase) return null;
    if (phase === 'pages') return pageTypeLabel ?? pagesLabel;
    if (phase === 'pdf') {
      if (progressDetail?.pdfStep === 'finalizing') return null;
      return pagesLabel;
    }
    if (phase === 'linking') return pagesLabel;
    return null;
  })();

  // Animate when page type or PDF step changes; let N/M update in place.
  const detailAnimationKey =
    phase === 'pages'
      ? `pages:${progressDetail?.pageType ?? detailText ?? ''}`
      : phase === 'pdf'
        ? `pdf:${progressDetail?.pdfStep ?? ''}`
        : `${phase ?? 'none'}:${detailText ?? ''}`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="export-progress-card"
          initial={{ opacity: 0, x: 24, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 24, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <button
            type="button"
            className="export-progress-card__dismiss"
            onClick={dismiss}
            aria-label={t('exportProgress.dismiss')}
          >
            <X className="export-progress-card__icon" />
          </button>

          {status === 'running' && (
            <div className="export-progress-card__body">
              <div className="export-progress-card__header">
                <Loader2 className="export-progress-card__icon export-progress-card__icon--spin" />
                <div className="export-progress-card__text">
                  <p className="export-progress-card__title">{t('exportProgress.title')}</p>
                  <p className="export-progress-card__subtitle">
                    <span className="export-progress-card__phase">{phaseLabel}</span>
                    {detailText && (
                      <>
                        <span className="export-progress-card__separator" aria-hidden="true">
                          {t('exportProgress.detailSeparator')}
                        </span>
                        <span className="export-progress-card__detail">
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={detailAnimationKey}
                              className="export-progress-card__detail-text"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                              {detailText}
                            </motion.span>
                          </AnimatePresence>
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span className="export-progress-card__percent">{Math.round(displayProgress)}%</span>
              </div>
              <div className="export-progress-card__track">
                <div
                  className="export-progress-card__fill export-progress-card__fill--animated"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
              {fileName && (
                <p className="export-progress-card__filename">{fileName}</p>
              )}
            </div>
          )}

          {status === 'complete' && (
            <div className="export-progress-card__body">
              <div className="export-progress-card__header">
                <CheckCircle2 className="export-progress-card__icon export-progress-card__icon--success" />
                <div className="export-progress-card__text">
                  <p className="export-progress-card__title">{t('exportProgress.readyTitle')}</p>
                  <p className="export-progress-card__subtitle">
                    {t('exportProgress.readySubtitle')}
                  </p>
                </div>
              </div>
              {fileName && (
                <p className="export-progress-card__filename">{fileName}</p>
              )}
              <Button
                type="button"
                className="export-progress-card__action"
                onClick={openPdf}
              >
                <ExternalLink className="export-progress-card__icon export-progress-card__icon--margin-right" />
                {t('exportProgress.openPdf')}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="export-progress-card__body">
              <div className="export-progress-card__header">
                <div className="export-progress-card__text">
                  <p className="export-progress-card__title export-progress-card__title--error">
                    {t('exportProgress.failedTitle')}
                  </p>
                  <p className="export-progress-card__subtitle">
                    {error ?? t('exportProgress.failedFallback')}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="export-progress-card__action"
                onClick={retryExport}
              >
                <RotateCcw className="export-progress-card__icon export-progress-card__icon--margin-right" />
                {t('exportProgress.retry')}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
