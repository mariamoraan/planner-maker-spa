import {
  createPdfAssembler,
  embedPageIntoAssembler,
  finalizePdfAssembler,
  type PdfAssemblePage,
  type PdfAssembler,
} from '@/features/export/domain/services/assemble-pdf';
import type { PdfPageLink } from '@/features/export/domain/entities/generated-page';

export type WorkerInboundMessage =
  | { type: 'init' }
  | {
      type: 'embedPage';
      page: PdfAssemblePage;
      current: number;
      total: number;
    }
  | {
      type: 'setLinks';
      linksByPageNumber: Array<{ pageNumber: number; links: PdfPageLink[] }>;
    }
  | { type: 'finalize'; total: number };

export type WorkerResponse =
  | {
      status: 'progress';
      current: number;
      total: number;
      step: 'embedding' | 'finalizing';
    }
  | { status: 'ready' }
  | { status: 'success'; pdfBytes: ArrayBuffer }
  | { status: 'error'; message: string };

let assembler: PdfAssembler | null = null;

self.onmessage = async (e: MessageEvent<WorkerInboundMessage>) => {
  const message = e.data;

  try {
    if (message.type === 'init') {
      assembler = await createPdfAssembler();
      self.postMessage({ status: 'ready' } satisfies WorkerResponse);
      return;
    }

    if (!assembler) {
      throw new Error('PDF worker not initialized');
    }

    if (message.type === 'embedPage') {
      await embedPageIntoAssembler(assembler, message.page, message.current - 1);
      self.postMessage({
        status: 'progress',
        current: message.current,
        total: message.total,
        step: 'embedding',
      } satisfies WorkerResponse);
      return;
    }

    if (message.type === 'setLinks') {
      const linkMap = new Map(
        message.linksByPageNumber.map(entry => [entry.pageNumber, entry.links]),
      );
      for (let i = 0; i < assembler.pdfPages.length; i++) {
        const pageNumber = i + 1;
        const entry = assembler.pdfPages[i];
        entry.links = linkMap.get(pageNumber) ?? entry.links;
      }
      // Also match by stored refs order — pages were embedded in order with pageNumber
      for (const [pageNumber, links] of linkMap) {
        const idx = pageNumber - 1;
        if (idx >= 0 && idx < assembler.pdfPages.length) {
          assembler.pdfPages[idx].links = links;
        }
      }
      self.postMessage({ status: 'ready' } satisfies WorkerResponse);
      return;
    }

    if (message.type === 'finalize') {
      const total = message.total;
      self.postMessage({
        status: 'progress',
        current: total,
        total,
        step: 'finalizing',
      } satisfies WorkerResponse);

      const pdfBytes = await finalizePdfAssembler(assembler, { fastSave: true });
      assembler = null;

      self.postMessage(
        { status: 'success', pdfBytes } satisfies WorkerResponse,
        { transfer: [pdfBytes] },
      );
    }
  } catch (error) {
    assembler = null;
    self.postMessage({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    } satisfies WorkerResponse);
  }
};
