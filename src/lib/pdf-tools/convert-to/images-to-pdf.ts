import { PDFDocument } from "pdf-lib";

async function transcodeImageToPngBytes(file: File): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error(`Unsupported image format "${file.name}". Please provide a PNG or JPG image.`);
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read image "${file.name}".`));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`Unsupported or corrupted image file "${file.name}".`));
    el.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, img.width);
  canvas.height = Math.max(1, img.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable for image conversion.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error(`Failed to convert "${file.name}" to PNG.`);
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Convert images (JPG / PNG / WebP / GIF) or PDF slide decks into a single unified PDF
 */
export async function convertImagesToPdf(
  files: File[]
): Promise<{ pdfBytes: Uint8Array; fileName: string; totalPages: number }> {
  if (!files || files.length === 0) {
    throw new Error("Please select at least 1 image or PDF file to convert.");
  }

  const pdfDoc = await PDFDocument.create();
  let totalPages = 0;

  for (const inputFile of files) {
    const buffer = await inputFile.arrayBuffer();
    const lowerName = inputFile.name.toLowerCase();

    // If user uploaded a PDF inside Scan to PDF / Slides to PDF, merge its pages seamlessly
    if (inputFile.type === "application/pdf" || lowerName.endsWith(".pdf")) {
      const srcPdf = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: true });
      const copiedPages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
      copiedPages.forEach((p) => {
        pdfDoc.addPage(p);
        totalPages++;
      });
      continue;
    }

    const bytes = new Uint8Array(buffer);
    const isPngHeader = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpgHeader = bytes[0] === 0xff && bytes[1] === 0xd8;

    let embeddedImage;
    if (isPngHeader) {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else if (isJpgHeader) {
      embeddedImage = await pdfDoc.embedJpg(bytes);
    } else {
      // Transcode WebP / GIF / BMP / SVG in browser canvas to lossless PNG
      const pngBytes = await transcodeImageToPngBytes(inputFile);
      embeddedImage = await pdfDoc.embedPng(pngBytes);
    }

    const { width, height } = embeddedImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
    totalPages++;
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = files[0].name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_converted.pdf`,
    totalPages,
  };
}
