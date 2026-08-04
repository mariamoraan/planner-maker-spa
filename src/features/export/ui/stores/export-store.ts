import { create } from 'zustand';
import type { Template } from '@/features/template';
import type { GeneratedPage } from '@/features/export/domain/entities/generated-page';
import {
  buildExportKey,
  runExport,
  triggerPdfDownload,
} from '@/features/export/domain/services/planner-export';
import { trackEvent } from '@/features/template/use-case/commands/analytics.commands';

export type ExportStatus = 'idle' | 'running' | 'complete' | 'error';
export type ExportPhase = 'pages' | 'pdf' | null;

interface PendingExport {
  template: Template;
  startDate: Date;
  endDate: Date;
}

interface ExportState {
  status: ExportStatus;
  progress: number;
  phase: ExportPhase;
  fileName: string | null;
  pdfBlobUrl: string | null;
  error: string | null;
  exportKey: string | null;
  cachedPages: GeneratedPage[] | null;
  pendingExport: PendingExport | null;
  isGeneratorOpen: boolean;

  startExport: (template: Template, startDate: Date, endDate: Date) => void;
  retryExport: () => void;
  dismiss: () => void;
  openPdf: () => void;
  openGenerator: () => void;
  closeGenerator: () => void;
  setIsGeneratorOpen: (isGeneratorOpen: boolean) => void;
}

function revokeBlobUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

export const useExportStore = create<ExportState>((set, get) => ({
  status: 'idle',
  progress: 0,
  phase: null,
  fileName: null,
  pdfBlobUrl: null,
  error: null,
  exportKey: null,
  cachedPages: null,
  pendingExport: null,
  isGeneratorOpen: false,

  startExport: (template, startDate, endDate) => {
    const { status, cachedPages, exportKey: cachedKey, pdfBlobUrl } = get();
    if (status === 'running') return;

    const exportKey = buildExportKey(
      template.id,
      startDate,
      endDate,
      template.updatedAt
    );

    const canUseCache = cachedKey === exportKey && cachedPages && cachedPages.length > 0;

    revokeBlobUrl(pdfBlobUrl);

    set({
      status: 'running',
      progress: 0,
      phase: 'pages',
      fileName: `${template.name}.pdf`,
      pdfBlobUrl: null,
      error: null,
      pendingExport: { template, startDate, endDate },
    });

    runExport({
      template,
      startDate,
      endDate,
      cachedPages: canUseCache ? cachedPages : null,
      cachedKey: canUseCache ? cachedKey : null,
      onProgress: (progress, phase) => {
        set({ progress: Math.min(100, Math.max(0, progress)), phase });
      },
    })
      .then(({ pdfBytes, fileName, pages }) => {
        const blobUrl = triggerPdfDownload(pdfBytes, fileName);
        trackEvent('planner_downloaded', { templateId: template.id });
        trackEvent('planner_generated', { templateId: template.id, pageCount: pages.length });
        set({
          status: 'complete',
          progress: 100,
          phase: null,
          fileName,
          pdfBlobUrl: blobUrl,
          exportKey,
          cachedPages: pages,
          pendingExport: null,
        });
      })
      .catch((err) => {
        set({
          status: 'error',
          phase: null,
          error: err instanceof Error ? err.message : 'Export failed',
        });
      });
  },

  retryExport: () => {
    const { pendingExport } = get();
    if (!pendingExport) return;
    const { template, startDate, endDate } = pendingExport;
    set({ status: 'idle', error: null, progress: 0 });
    get().startExport(template, startDate, endDate);
  },

  dismiss: () => {
    revokeBlobUrl(get().pdfBlobUrl);
    set({
      status: 'idle',
      progress: 0,
      phase: null,
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
}));
