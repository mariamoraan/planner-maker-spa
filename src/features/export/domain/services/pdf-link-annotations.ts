import type { PDFDocument, PDFPage, PDFRef } from 'pdf-lib';
import type { PdfPageLink } from '@/features/export/domain/entities/generated-page';

/**
 * Register a Link annotation with an internal GoTo action.
 * Uses `/A` (Action) rather than bare `/Dest` for better Preview/GoodNotes compatibility.
 * Rect uses PDF coordinates (origin bottom-left): [llx, lly, urx, ury].
 */
export function addGoToLink(
  pdfDoc: PDFDocument,
  page: PDFPage,
  link: PdfPageLink,
  destPageRef: PDFRef,
): void {
  const { x, y, width, height } = link;
  const annotRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      // Invert highlight so the hit area responds visibly on click/hover
      H: 'I',
      A: {
        Type: 'Action',
        S: 'GoTo',
        // Fit the destination page — more reliable than XYZ with nulls
        D: [destPageRef, 'Fit'],
      },
    }),
  );
  page.node.addAnnot(annotRef);
}

/** Attach all GoTo links for a page. destPageNumber is 1-based. */
export function addGoToLinks(
  pdfDoc: PDFDocument,
  page: PDFPage,
  links: PdfPageLink[] | undefined,
  pageRefsByNumber: Map<number, PDFRef>,
): void {
  if (!links?.length) return;

  for (const link of links) {
    const destRef = pageRefsByNumber.get(link.destPageNumber);
    if (!destRef) continue;
    addGoToLink(pdfDoc, page, link, destRef);
  }
}
