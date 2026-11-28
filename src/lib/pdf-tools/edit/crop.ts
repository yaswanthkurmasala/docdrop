import { PDFDocument } from "pdf-lib";
import { safeLoadPdfDoc } from "../common/safe-pdf-loader.ts";

export interface CropMargins {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export type CropPreset = "minimal" | "standard" | "generous" | "custom";
export type CropPageScope = "all" | "odd" | "even" | "custom";

export interface CropPdfOptions {
  preset?: CropPreset;
  marginPt?: number; // uniform margin
  margins?: CropMargins; // individual margins
  pageScope?: CropPageScope;
  customPages?: string;
  onProgress?: (percent: number, message: string) => void;
}

export interface CropPdfResult {
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
  pagesCropped: number;
  marginsApplied: { top: number; bottom: number; left: number; right: number };
  summary: string;
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
 * Trim page crop boxes evenly or with asymmetric margins
 * Supports presets, individual side margins, and selective page scopes
 */
export async function cropPdf(
  file: File,
  optionsOrMargin: CropPdfOptions | number = 36
): Promise<CropPdfResult> {
  const opts: CropPdfOptions =
    typeof optionsOrMargin === "number" ? { marginPt: optionsOrMargin } : optionsOrMargin;

  const onProgress = opts.onProgress;
  onProgress?.(15, "Loading PDF document in client memory...");

  const pdfDoc = await safeLoadPdfDoc(file);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  let top = opts.margins?.top ?? opts.marginPt ?? 36;
  let bottom = opts.margins?.bottom ?? opts.marginPt ?? 36;
  let left = opts.margins?.left ?? opts.marginPt ?? 36;
  let right = opts.margins?.right ?? opts.marginPt ?? 36;

  if (opts.preset === "minimal") {
    top = bottom = left = right = 18;
  } else if (opts.preset === "standard") {
    top = bottom = left = right = 36;
  } else if (opts.preset === "generous") {
    top = bottom = left = right = 54;
  }

  const pageScope = opts.pageScope ?? "all";
  const customSet = pageScope === "custom" ? parseCustomPages(opts.customPages, totalPages) : null;

  onProgress?.(45, `Applying crop margins (${top}pt T, ${bottom}pt B, ${left}pt L, ${right}pt R)...`);

  let pagesCropped = 0;
  for (let idx = 0; idx < totalPages; idx++) {
    const pageNum = idx + 1;
    let shouldCrop = false;

    if (pageScope === "all") {
      shouldCrop = true;
    } else if (pageScope === "odd") {
      shouldCrop = pageNum % 2 !== 0;
    } else if (pageScope === "even") {
      shouldCrop = pageNum % 2 === 0;
    } else if (pageScope === "custom") {
      shouldCrop = customSet ? customSet.has(pageNum) : false;
    }

    if (shouldCrop) {
      const page = pages[idx];
      const { width, height } = page.getSize();

      // Safe clamp so margins do not exceed page dimensions
      const safeLeft = Math.min(left, width / 2 - 10);
      const safeRight = Math.min(right, width / 2 - 10);
      const safeBottom = Math.min(bottom, height / 2 - 10);
      const safeTop = Math.min(top, height / 2 - 10);

      const cropX = Math.max(0, safeLeft);
      const cropY = Math.max(0, safeBottom);
      const cropW = Math.max(20, width - safeLeft - safeRight);
      const cropH = Math.max(20, height - safeBottom - safeTop);

      page.setCropBox(cropX, cropY, cropW, cropH);
      pagesCropped++;
    }
  }

  onProgress?.(85, "Saving trimmed PDF document...");
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, "Done!");

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const summary = `Cropped ${pagesCropped} of ${totalPages} page(s) (Trim: T:${top}pt, B:${bottom}pt, L:${left}pt, R:${right}pt)`;

  return {
    pdfBytes,
    fileName: `${baseName}_cropped.pdf`,
    totalPages,
    pagesCropped,
    marginsApplied: { top, bottom, left, right },
    summary,
  };
}
