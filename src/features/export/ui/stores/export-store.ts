import { create } from 'zustand';
import type { Template } from '@/features/template';
import {
  buildExportKey,
  runExport,
  triggerPdfDownload,
  type ExportPageType,
  type ExportPhase,
  type ExportPdfStep,
  type ExportProgressDetail,
} from '@/features/export/domain/services/planner-export';
import { trackEvent } from '@/features/template/use-case/commands/analytics.commands';

export type ExportStatus = 'idle' | 'running' | 'complete' | 'error';
export type { ExportPhase, ExportPageType, ExportPdfStep, ExportProgressDetail };

interface PendingExport {
  template: Template;
  startDate: Date;
  endDate: Date;
  includeInternalLinks: boolean;
}

interface ExportState {
  status: ExportStatus;
  progress: number;
  phase: ExportPhase | null;
  progressDetail: ExportProgressDetail | null;
  fileName: string | null;
  pdfBlobUrl: string | null;
  error: string | null;
  exportKey: string | null;
  pendingExport: PendingExport | null;
  isGeneratorOpen: boolean;
  includeInternalLinks: boolean;

  startExport: (
    template: Template,
    startDate: Date,
    endDate: Date,
    options?: { includeInternalLinks?: boolean },
  ) => void;
  retryExport: () => void;
  dismiss: () => void;
  openPdf: () => void;
  openGenerator: () => void;
  closeGenerator: () => void;
  setIsGeneratorOpen: (isGeneratorOpen: boolean) => void;
  setIncludeInternalLinks: (includeInternalLinks: boolean) => void;
}

function revokeBlobUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

export const useExportStore = create<ExportState>((set, get) => ({
  status: 'idle',
  progress: 0,
  phase: null,
  progressDetail: null,
  fileName: null,
  pdfBlobUrl: null,
  error: null,
  exportKey: null,
  pendingExport: null,
  isGeneratorOpen: false,
  includeInternalLinks: true,

  startExport: (template, startDate, endDate, options) => {
    const { status, pdfBlobUrl, includeInternalLinks: storeLinks } = get();
    if (status === 'running') return;

    const includeInternalLinks = options?.includeInternalLinks ?? storeLinks;

    const exportKey = buildExportKey(
      template.id,
      startDate,
      endDate,
      template.updatedAt,
      includeInternalLinks,
    );

    revokeBlobUrl(pdfBlobUrl);

    set({
      status: 'running',
      progress: 0,
      phase: 'preparing',
      progressDetail: { current: 0, total: 1 },
      fileName: `${template.name}.pdf`,
      pdfBlobUrl: null,
      error: null,
      includeInternalLinks,
      pendingExport: { template, startDate, endDate, includeInternalLinks },
    });

    runExport({
      template,
      startDate,
      endDate,
      includeInternalLinks,
      onProgress: (progress, phase, detail) => {
        set({
          progress: Math.min(100, Math.max(0, progress)),
          phase,
          progressDetail: detail ?? null,
        });
      },
    })
      .then(({ pdfBytes, fileName, pageCount }) => {
        const blobUrl = triggerPdfDownload(pdfBytes, fileName);
        trackEvent('planner_downloaded', { templateId: template.id });
        trackEvent('planner_generated', { templateId: template.id, pageCount });
        set({
          status: 'complete',
          progress: 100,
          phase: null,
          progressDetail: null,
          fileName,
          pdfBlobUrl: blobUrl,
          exportKey,
          pendingExport: null,
        });
      })
      .catch((err) => {
        set({
          status: 'error',
          phase: null,
          progressDetail: null,
          error: err instanceof Error ? err.message : 'Export failed',
        });
      });
  },

  retryExport: () => {
    const { pendingExport } = get();
    if (!pendingExport) return;
    const { template, startDate, endDate, includeInternalLinks } = pendingExport;
    set({ status: 'idle', error: null, progress: 0, progressDetail: null });
    get().startExport(template, startDate, endDate, { includeInternalLinks });
  },

  dismiss: () => {
    revokeBlobUrl(get().pdfBlobUrl);
    set({
      status: 'idle',
      progress: 0,
      phase: null,
      progressDetail: null,
      fileName: null,
      pdfBlobUrl: null,
      error: null,
      pendingExport: null,
    });
  },

  openPdf: () => {
    const { pdfBlobUrl } = get();
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    }
  },

  openGenerator: () => set({ isGeneratorOpen: true }),
  closeGenerator: () => set({ isGeneratorOpen: false }),
  setIsGeneratorOpen: (isGeneratorOpen) => set({ isGeneratorOpen }),
  setIncludeInternalLinks: (includeInternalLinks) => set({ includeInternalLinks }),
}));
