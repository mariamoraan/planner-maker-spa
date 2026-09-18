import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import { assemblePdfFromPages } from '@/features/export/domain/services/assemble-pdf';

/** 1×1 red PNG */
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('assemblePdfFromPages with links', () => {
  it('embeds pages and writes link annotations without failing', async () => {
    const pdfBytes = await assemblePdfFromPages([
      {
        imageData: TINY_PNG,
        width: 100,
        height: 100,
        pageNumber: 1,
        links: [{ x: 5, y: 5, width: 20, height: 10, destPageNumber: 2 }],
        paperSize: { kind: 'A4', orientation: 'portrait' },
      },
      {
        imageData: TINY_PNG,
        width: 100,
        height: 100,
        pageNumber: 2,
        paperSize: { kind: 'A4', orientation: 'portrait' },
      },
    ]);

    expect(pdfBytes.byteLength).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(2);

    const annots = pdfDoc.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray);
    expect(annots.size()).toBe(1);
  });

  it('assembles pages without links as before', async () => {
    const pdfBytes = await assemblePdfFromPages([
      {
        imageData: TINY_PNG,
        width: 50,
        height: 50,
        paperSize: { kind: 'A5', orientation: 'portrait' },
      },
    ]);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);
  });
});
