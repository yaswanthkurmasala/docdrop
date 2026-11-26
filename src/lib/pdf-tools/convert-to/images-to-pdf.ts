import { PDFDocument } from "pdf-lib";

export interface ImagesToPdfOptions {
  orientation?: "auto" | "portrait" | "landscape";
  pageSize?: "fit" | "a4" | "letter";
  margin?: "none" | "small" | "large";
  rotations?: number[];
  onProgress?: (percent: number, message: string) => void;
}

async function transcodeImageToPngBytes(file: File, rotationDeg: number = 0): Promise<Uint8Array> {
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

  const normRot = ((rotationDeg % 360) + 360) % 360;
  const isSideways = normRot === 90 || normRot === 270;
  const canvas = document.createElement("canvas");
  canvas.width = isSideways ? img.height : img.width;
  canvas.height = isSideways ? img.width : img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable for image conversion.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (normRot !== 0) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normRot * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
  } else {
    ctx.drawImage(img, 0, 0);
  }

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error(`Failed to convert "${file.name}" to PNG.`);
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Convert images (JPG / PNG / WebP / GIF / BMP) or PDF slide decks into a single unified high-quality PDF
 */
export async function convertImagesToPdf(
  files: File[],
  options?: ImagesToPdfOptions
): Promise<{ pdfBytes: Uint8Array; fileName: string; totalPages: number }> {
  if (!files || files.length === 0) {
    throw new Error("Please select at least 1 image or PDF file to convert.");
  }

  const pageSizeOpt = options?.pageSize || "a4";
  const orientationOpt = options?.orientation || "auto";
  const marginOpt = options?.margin || "none";
  const rotations = options?.rotations || [];
  const onProgress = options?.onProgress;

  const marginPt = marginOpt === "large" ? 40 : marginOpt === "small" ? 20 : 0;

  const pdfDoc = await PDFDocument.create();
  let totalPages = 0;
  const totalCount = files.length;

  for (let idx = 0; idx < files.length; idx++) {
    const inputFile = files[idx];
    const userRotation = rotations[idx] || 0;
    const progressPercent = Math.min(95, Math.round(((idx + 1) / totalCount) * 85));
    onProgress?.(progressPercent, `Processing image ${idx + 1} of ${totalCount}: ${inputFile.name}...`);

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
    if (typeof document !== "undefined" && (userRotation % 360 !== 0 || (!isPngHeader && !isJpgHeader))) {
      // Transcode / rotate in browser Canvas
      const transBytes = await transcodeImageToPngBytes(inputFile, userRotation);
      embeddedImage = await pdfDoc.embedPng(transBytes);
    } else if (isPngHeader) {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else if (isJpgHeader) {
      embeddedImage = await pdfDoc.embedJpg(bytes);
    } else {
      const pngBytes = await transcodeImageToPngBytes(inputFile, userRotation);
      embeddedImage = await pdfDoc.embedPng(pngBytes);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    if (pageSizeOpt === "fit") {
      // Fit page exactly to image dimensions + margin
      const pageWidth = imgWidth + marginPt * 2;
      const pageHeight = imgHeight + marginPt * 2;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImage, {
        x: marginPt,
        y: marginPt,
        width: imgWidth,
        height: imgHeight,
      });
    } else {
      // Standard paper size (A4: 595.28 x 841.89 pt, Letter: 612 x 792 pt)
      const standardDims = pageSizeOpt === "letter" ? { w: 612, h: 792 } : { w: 595.28, h: 841.89 };
      let pageW: number;
      let pageH: number;

      if (orientationOpt === "landscape") {
        pageW = Math.max(standardDims.w, standardDims.h);
        pageH = Math.min(standardDims.w, standardDims.h);
      } else if (orientationOpt === "portrait") {
        pageW = Math.min(standardDims.w, standardDims.h);
        pageH = Math.max(standardDims.w, standardDims.h);
      } else {
        // Auto: match image aspect ratio
        if (imgWidth > imgHeight) {
          pageW = Math.max(standardDims.w, standardDims.h);
          pageH = Math.min(standardDims.w, standardDims.h);
        } else {
          pageW = Math.min(standardDims.w, standardDims.h);
          pageH = Math.max(standardDims.w, standardDims.h);
        }
      }

      const usableW = Math.max(10, pageW - marginPt * 2);
      const usableH = Math.max(10, pageH - marginPt * 2);
      const scale = Math.min(usableW / imgWidth, usableH / imgHeight);
      const drawW = imgWidth * scale;
      const drawH = imgHeight * scale;
      const drawX = marginPt + (usableW - drawW) / 2;
      const drawY = marginPt + (usableH - drawH) / 2;

      const page = pdfDoc.addPage([pageW, pageH]);
      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });
    }

    totalPages++;
  }

  onProgress?.(95, "Serializing high-fidelity PDF document in memory...");
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, "Done!");

  const baseName = files[0].name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_converted.pdf`,
    totalPages,
  };
}
