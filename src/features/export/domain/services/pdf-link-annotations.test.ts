import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName, PDFArray, PDFDict } from 'pdf-lib';
import { addGoToLink, addGoToLinks } from '@/features/export/domain/services/pdf-link-annotations';

describe('pdf-link-annotations', () => {
  it('writes a Link annotation with GoTo Action to another page', async () => {
    const pdfDoc = await PDFDocument.create();
    const page1 = pdfDoc.addPage([200, 200]);
    const page2 = pdfDoc.addPage([200, 200]);

    addGoToLink(
      pdfDoc,
      page1,
      { x: 10, y: 20, width: 40, height: 15, destPageNumber: 2 },
      page2.ref,
    );

    const annots = page1.node.lookup(PDFName.of('Annots'), PDFArray);
    expect(annots.size()).toBe(1);

    const annot = annots.lookup(0, PDFDict);
    expect(annot.lookup(PDFName.of('Subtype'))).toEqual(PDFName.of('Link'));

    const rect = annot.lookup(PDFName.of('Rect'), PDFArray);
    expect(rect.lookup(0).toString()).toBe('10');
    expect(rect.lookup(1).toString()).toBe('20');
    expect(rect.lookup(2).toString()).toBe('50');
    expect(rect.lookup(3).toString()).toBe('35');

    const action = annot.lookup(PDFName.of('A'), PDFDict);
    expect(action.lookup(PDFName.of('S'))).toEqual(PDFName.of('GoTo'));
    const dest = action.lookup(PDFName.of('D'), PDFArray);
    expect(dest.get(0)).toBe(page2.ref);
    expect(dest.lookup(1)).toEqual(PDFName.of('Fit'));

    const bytes = await pdfDoc.save();
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('skips links whose destination page is missing', async () => {
    const pdfDoc = await PDFDocument.create();
    const page1 = pdfDoc.addPage([100, 100]);
    const refs = new Map([[1, page1.ref]]);

    addGoToLinks(
      pdfDoc,
      page1,
      [{ x: 0, y: 0, width: 10, height: 10, destPageNumber: 99 }],
      refs,
    );

    const annots = page1.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    expect(annots == null || annots.size() === 0).toBe(true);
  });
});
