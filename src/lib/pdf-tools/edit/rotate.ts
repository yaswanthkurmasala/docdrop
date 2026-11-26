import { PDFDocument, degrees } from "pdf-lib";

export interface RotatePdfOptions {
  angleDegrees?: number; // 90, 180, 270
  pageScope?: "all" | "odd" | "even" | "custom";
  customPages?: string; // e.g. "1, 3, 5"
  onProgress?: (percent: number, message: string) => void;
}

function parseCustomPages(customStr: string | undefined, totalPages: number): Set<number> {
  const result = new Set<number>();
  if (!customStr) return result;
  const parts = customStr.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((n) => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) result.add(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        result.add(num);
      }
    }
  }
  return result;
}

/**
 * Rotates pages in PDF by 90, 180, or 270 degrees clockwise
 * Supports selective page scopes: All Pages, Odd Pages, Even Pages, or Custom Page Ranges
 */
export async function rotatePdf(
  file: File,
  optionsOrAngle: RotatePdfOptions | number = 90
): Promise<{ pdfBytes: Uint8Array; fileName: string; totalPages: number }> {
  const opts: RotatePdfOptions = typeof optionsOrAngle === "number" ? { angleDegrees: optionsOrAngle } : optionsOrAngle;
  const angleDegrees = opts.angleDegrees ?? 90;
  const pageScope = opts.pageScope ?? "all";
  const onProgress = opts.onProgress;

  onProgress?.(15, "Loading PDF document in memory...");
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const total = pages.length;

  const customSet = pageScope === "custom" ? parseCustomPages(opts.customPages, total) : null;

  onProgress?.(45, `Applying +${angleDegrees}° rotation to ${pageScope} pages...`);
  let rotatedCount = 0;

  for (let idx = 0; idx < total; idx++) {
    const pageNum = idx + 1;
    let shouldRotate = false;

    if (pageScope === "all") {
      shouldRotate = true;
    } else if (pageScope === "odd") {
      shouldRotate = pageNum % 2 !== 0;
    } else if (pageScope === "even") {
      shouldRotate = pageNum % 2 === 0;
    } else if (pageScope === "custom") {
      shouldRotate = customSet ? customSet.has(pageNum) : false;
    }

    if (shouldRotate) {
      const page = pages[idx];
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angleDegrees) % 360));
      rotatedCount++;
    }
  }

  onProgress?.(85, "Saving rotated PDF structure...");
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, "Done!");

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_rotated_${angleDegrees}deg.pdf`,
    totalPages: total,
  };
}
