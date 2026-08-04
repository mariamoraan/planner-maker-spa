import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { useExportStore } from '@/features/export/ui/stores/export-store';
import './export-progress-card.scss';

const phaseLabels: Record<string, string> = {
  pages: 'Generating pages…',
  pdf: 'Building PDF…',
};

export const ExportProgressCard: React.FC = () => {
  const status = useExportStore(state => state.status);
  const progress = useExportStore(state => state.progress);
  const phase = useExportStore(state => state.phase);
  const fileName = useExportStore(state => state.fileName);
  const error = useExportStore(state => state.error);
  const dismiss = useExportStore(state => state.dismiss);
  const openPdf = useExportStore(state => state.openPdf);
  const retryExport = useExportStore(state => state.retryExport);

  const displayProgress = Math.min(100, Math.max(0, progress));

  const isVisible = status === 'running' || status === 'complete' || status === 'error';

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
            aria-label="Dismiss"
          >
            <X className="export-progress-card__icon" />
          </button>

          {status === 'running' && (
            <div className="export-progress-card__body">
              <div className="export-progress-card__header">
                <Loader2 className="export-progress-card__icon export-progress-card__icon--spin" />
                <div className="export-progress-card__text">
                  <p className="export-progress-card__title">Exporting planner</p>
                  <p className="export-progress-card__subtitle">
                    {phase ? phaseLabels[phase] : 'Preparing…'}
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
                  <p className="export-progress-card__title">Your planner is ready</p>
                  <p className="export-progress-card__subtitle">
                    Download started automatically
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
                Open PDF
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="export-progress-card__body">
              <div className="export-progress-card__header">
                <div className="export-progress-card__text">
                  <p className="export-progress-card__title export-progress-card__title--error">
                    Export failed
                  </p>
                  <p className="export-progress-card__subtitle">{error}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="export-progress-card__action"
                onClick={retryExport}
              >
                <RotateCcw className="export-progress-card__icon export-progress-card__icon--margin-right" />
                Retry
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
