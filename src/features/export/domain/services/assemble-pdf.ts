import { PDFDocument, type PDFPage, type PDFRef } from 'pdf-lib';
import { resolvePdfPageSizeForExport } from '@/features/export/domain/services/pdf-page-size';
import { addGoToLinks } from '@/features/export/domain/services/pdf-link-annotations';
import type { PageImageData, PdfPageLink } from '@/features/export/domain/entities/generated-page';
import type { PaperSize } from '@/features/template/domain/services/paper-size';
import { yieldToUi } from '@/features/export/domain/services/canvas-png';

export type PdfAssemblePage = {
  imageData: PageImageData;
  width?: number;
  height?: number;
  paperSize?: PaperSize;
  pageNumber?: number;
  links?: PdfPageLink[];
};

export type AssembleProgressStep = 'embedding' | 'finalizing';

export type PdfAssembler = {
  pdfDoc: PDFDocument;
  pageRefsByNumber: Map<number, PDFRef>;
  pdfPages: Array<{ pdfPage: PDFPage; links?: PdfPageLink[] }>;
};

function resolvePngBytes(imageData: PageImageData): Uint8Array {
  if (imageData instanceof Uint8Array) {
    return imageData;
  }

  const base64 = imageData.split(',')[1];
  if (!base64) {
    throw new Error('Page missing base64 imageData');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(pdfBytes: Uint8Array): ArrayBuffer {
  if (pdfBytes.byteOffset === 0 && pdfBytes.byteLength === pdfBytes.buffer.byteLength) {
    return pdfBytes.buffer as ArrayBuffer;
  }
  return pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
}

export async function createPdfAssembler(): Promise<PdfAssembler> {
  const pdfDoc = await PDFDocument.create();
  return {
    pdfDoc,
    pageRefsByNumber: new Map(),
    pdfPages: [],
  };
}

/** Embed one PNG page into the open assembler (does not keep a copy of the bytes). */
export async function embedPageIntoAssembler(
  assembler: PdfAssembler,
  page: PdfAssemblePage,
  indexFallback = 0,
): Promise<void> {
  const pngBytes = resolvePngBytes(page.imageData);
  const pngImage = await assembler.pdfDoc.embedPng(pngBytes);
  const widthPx = page.width ?? pngImage.width;
  const heightPx = page.height ?? pngImage.height;
  const pageSize = resolvePdfPageSizeForExport(widthPx, heightPx, page.paperSize);

  const pdfPage = assembler.pdfDoc.addPage([pageSize.width, pageSize.height]);
  pdfPage.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height,
  });

  const pageNumber = page.pageNumber ?? indexFallback + 1;
  assembler.pageRefsByNumber.set(pageNumber, pdfPage.ref);
  assembler.pdfPages.push({ pdfPage, links: page.links });
}

export async function finalizePdfAssembler(
  assembler: PdfAssembler,
  options?: {
    /** Prefer worker / non-UI contexts so save does not yield every 50 objects. */
    fastSave?: boolean;
    onFinalizing?: () => void;
  },
): Promise<ArrayBuffer> {
  for (const { pdfPage, links } of assembler.pdfPages) {
    addGoToLinks(assembler.pdfDoc, pdfPage, links, assembler.pageRefsByNumber);
  }

  options?.onFinalizing?.();

  const pdfBytes = await assembler.pdfDoc.save({
    useObjectStreams: false,
    // Infinity is fine in a worker; on the main thread a large tick still yields a bit.
    objectsPerTick: options?.fastSave === false ? 250 : Infinity,
    updateFieldAppearances: false,
  });

  return toArrayBuffer(pdfBytes);
}

/**
 * Embed PNG data into a PDF. Shared by tests and the main-thread fallback.
 * Prefer streaming embedPageIntoAssembler for large planners.
 */
export async function assemblePdfFromPages(
  pages: PdfAssemblePage[],
  onProgress?: (current: number, total: number, step?: AssembleProgressStep) => void,
): Promise<ArrayBuffer> {
  const assembler = await createPdfAssembler();
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    await embedPageIntoAssembler(assembler, pages[i], i);
    onProgress?.(i + 1, total, 'embedding');
    await yieldToUi();
  }

  return finalizePdfAssembler(assembler, {
    fastSave: true,
    onFinalizing: () => onProgress?.(total, total, 'finalizing'),
  });
}
