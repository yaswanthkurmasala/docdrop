import { PDFDocument } from "pdf-lib";

/**
 * Convert images (JPG / PNG) into a single unified PDF
 */
export async function convertImagesToPdf(
  images: File[]
): Promise<{ pdfBytes: Uint8Array; fileName: string; totalPages: number }> {
  if (!images || images.length === 0) {
    throw new Error("Please select at least 1 image to convert.");
  }

  const pdfDoc = await PDFDocument.create();

  for (const imgFile of images) {
    const imgBuffer = await imgFile.arrayBuffer();
    const isPng = imgFile.type === "image/png" || imgFile.name.toLowerCase().endsWith(".png");

    let embeddedImage;
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(imgBuffer);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imgBuffer);
    }

    const { width, height } = embeddedImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = images[0].name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_converted.pdf`,
    totalPages: images.length,
  };
}
