import { PDFDocument, degrees } from "pdf-lib";

/**
 * Rotates all pages in PDF by 90, 180, or 270 degrees clockwise
 */
export async function rotatePdf(
  file: File,
  angleDegrees: number = 90
): Promise<{ pdfBytes: Uint8Array; fileName: string; totalPages: number }> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + angleDegrees) % 360));
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_rotated_${angleDegrees}deg.pdf`,
    totalPages: pages.length,
  };
}
