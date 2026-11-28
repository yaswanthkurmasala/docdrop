import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import { safeLoadPdfDoc } from "./common/safe-pdf-loader.ts";

export interface MergeResult {
  mergedBytes: Uint8Array;
  totalPages: number;
  totalFiles: number;
  fileName: string;
}

export interface MergeFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  thumbnailUrl?: string;
  rotation?: number;  // 0, 90, 180, 270
  pageRange?: string; // e.g. "all", "1-3", "1, 2"
}

export interface MergeOptions {
  addPageNumbers?: boolean;
  pageNumberPosition?: "bottom-center" | "bottom-right";
  customOutputName?: string;
}

/**
 * Reads a PDF file and returns its total page count.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfDoc = await safeLoadPdfDoc(file);
  return pdfDoc.getPageCount();
}

/**
 * Parses user page range input like "1-3", "all", "1, 3, 5" into 0-based indices.
 */
function parsePageRange(rangeStr: string | undefined, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === "all" || rangeStr.trim() === "") {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const result: number[] = [];
  const parts = rangeStr.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((n) => parseInt(n.trim(), 10));
      const s = Math.max(1, Math.min(startStr || 1, totalPages));
      const e = Math.max(s, Math.min(endStr || totalPages, totalPages));
      for (let idx = s; idx <= e; idx++) {
        result.push(idx - 1);
      }
    } else {
      const pNum = parseInt(part, 10);
      if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) {
        result.push(pNum - 1);
      }
    }
  }

  return result.length > 0 ? result : Array.from({ length: totalPages }, (_, i) => i);
}

/**
 * Merges multiple PDF files into one single PDF document 100% in the browser.
 * Supports:
 * - Simple File[] list (backwards-compatible)
 * - Rich MergeFileItem[] with per-document page ranges & rotation angles
 * - Optional continuous page numbering ("Page X of Y")
 * - Stream compression and metadata cleaning
 */
export async function mergePdfFiles(
  files: (File | MergeFileItem)[],
  options: MergeOptions = {}
): Promise<MergeResult> {
  if (!files || files.length < 2) {
    throw new Error("Please select at least 2 PDF files to merge.");
  }

  const mergedPdf = await PDFDocument.create();

  for (const item of files) {
    const file = "file" in item ? item.file : item;
    const rotation = "rotation" in item ? item.rotation || 0 : 0;
    const pageRange = "pageRange" in item ? item.pageRange : "all";

    const pdfDoc = await safeLoadPdfDoc(file);
    const fileTotalPages = pdfDoc.getPageCount();

    const targetIndices = parsePageRange(pageRange, fileTotalPages);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, targetIndices);

    for (const page of copiedPages) {
      if (rotation !== 0) {
        const curAngle = page.getRotation().angle;
        page.setRotation(degrees((curAngle + rotation) % 360));
      }
      mergedPdf.addPage(page);
    }
  }

  const totalPages = mergedPdf.getPageCount();

  // Apply continuous page numbering if requested
  if (options.addPageNumbers && totalPages > 0) {
    try {
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
      const isRight = options.pageNumberPosition === "bottom-right";

      for (let i = 0; i < totalPages; i++) {
        const page = mergedPdf.getPage(i);
        const { width } = page.getSize();
        const text = `Page ${i + 1} of ${totalPages}`;
        const fontSize = 9;
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        const x = isRight ? width - textWidth - 36 : (width - textWidth) / 2;
        const y = 24;

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.25, 0.25, 0.25),
        });
      }
    } catch (e) {
      console.warn("Failed stamping continuous page numbers:", e);
    }
  }

  // Set clean metadata
  try {
    const firstFile = "file" in files[0] ? files[0].file : files[0];
    mergedPdf.setTitle(`${firstFile.name.replace(/\.[^/.]+$/, "")} (Merged)`);
    mergedPdf.setProducer("DocDrop In-Browser PDF Suite");
    mergedPdf.setCreator("DocDrop Universal Merger");
  } catch {
    // Ignore
  }

  const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
  const firstFile = "file" in files[0] ? files[0].file : files[0];
  const baseName = firstFile.name.replace(/\.[^/.]+$/, "");
  const fileName = options.customOutputName?.trim()
    ? (options.customOutputName.endsWith(".pdf") ? options.customOutputName : `${options.customOutputName}.pdf`)
    : `${baseName}_merged.pdf`;

  return {
    mergedBytes,
    totalPages,
    totalFiles: files.length,
    fileName,
  };
}
