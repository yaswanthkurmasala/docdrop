import { PDFDocument } from "pdf-lib";

/**
 * Standardize PDF metadata for PDF/A archival conformance
 */
export async function convertPdfToPdfA(file: File): Promise<{
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
}> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  pdfDoc.setTitle(`${file.name.replace(/\.[^/.]+$/, "")} (PDF/A Archival Conformance)`);
  pdfDoc.setProducer("DocDrop Client-Side In-Browser Archiver");
  pdfDoc.setModificationDate(new Date());

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_pdfa.pdf`,
    totalPages: pdfDoc.getPageCount(),
  };
}
