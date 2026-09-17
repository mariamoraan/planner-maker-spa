import { PDFDocument } from 'pdf-lib';
import { resolvePdfPageSizeForExport } from '@/features/export/domain/services/pdf-page-size';
import type { PaperSize } from '@/features/template/domain/services/paper-size';

export type PdfAssemblePage = {
  imageData: string;
  width?: number;
  height?: number;
  paperSize?: PaperSize;
};

/**
 * Embed PNG data-URLs into a PDF. Shared by the PDF worker and the
 * main-thread fallback (Vite dep-optimizer 504 can prevent the worker from loading).
 */
export async function assemblePdfFromPages(
  pages: PdfAssemblePage[],
  onProgress?: (current: number, total: number) => void,
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const base64 = page.imageData.split(',')[1];
    if (!base64) {
      throw new Error(`Page ${i} missing base64 imageData`);
    }
    const pngBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    const pngImage = await pdfDoc.embedPng(pngBytes);
    const widthPx = page.width ?? pngImage.width;
    const heightPx = page.height ?? pngImage.height;
    const pageSize = resolvePdfPageSizeForExport(widthPx, heightPx, page.paperSize);

    const pdfPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pageSize.width,
      height: pageSize.height,
    });

    onProgress?.(i + 1, total);
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
}
