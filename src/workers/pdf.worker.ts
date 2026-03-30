import { PDFDocument } from 'pdf-lib';

const A5_HORIZONTAL = { height: 419.53, width: 595.28 } // pt

type WorkerMessage = {
  pages: { imageData: string }[];
  fileName: string;
};

export type WorkerResponse =
  | { status: 'success'; pdfBytes: ArrayBuffer }
  | { status: 'error'; message: string };

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const { pages } = e.data;
    const pdfDoc = await PDFDocument.create();

    for (const page of pages) {
      const base64 = page.imageData.split(',')[1];
      const pngBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const pngImage = await pdfDoc.embedPng(pngBytes);
      const pdfPage = pdfDoc.addPage([A5_HORIZONTAL.width, A5_HORIZONTAL.height]);
      pdfPage.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: A5_HORIZONTAL.width, 
        height: A5_HORIZONTAL.height, 
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Transferimos el buffer por referencia en vez de copiarlo — más eficiente
    self.postMessage(
      { status: 'success', pdfBytes: pdfBytes.buffer as ArrayBuffer } satisfies WorkerResponse,
      { transfer: [pdfBytes.buffer] }
    );
  } catch (error) {
    self.postMessage({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido',
    } satisfies WorkerResponse);
  }
};