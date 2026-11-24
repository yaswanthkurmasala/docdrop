import { PDFDocument } from "pdf-lib";

/**
 * Trim page crop boxes evenly
 */
export async function cropPdf(
  file: File,
  marginPt: number = 36
): Promise<{ pdfBytes: Uint8Array; fileName: string; totalPages: number }> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.setCropBox(marginPt, marginPt, width - marginPt * 2, height - marginPt * 2);
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_cropped.pdf`,
    totalPages: pages.length,
  };
}
