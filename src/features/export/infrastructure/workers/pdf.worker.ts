import { assemblePdfFromPages, type PdfAssemblePage } from '@/features/export/domain/services/assemble-pdf';

type WorkerMessage = {
  pages: PdfAssemblePage[];
};

export type WorkerResponse =
  | { status: 'progress'; current: number; total: number }
  | { status: 'success'; pdfBytes: ArrayBuffer }
  | { status: 'error'; message: string };

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const { pages } = e.data;
    const pdfBytes = await assemblePdfFromPages(pages, (current, total) => {
      self.postMessage({
        status: 'progress',
        current,
        total,
      } satisfies WorkerResponse);
    });

    self.postMessage(
      { status: 'success', pdfBytes } satisfies WorkerResponse,
      { transfer: [pdfBytes] },
    );
  } catch (error) {
    self.postMessage({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    } satisfies WorkerResponse);
  }
};
