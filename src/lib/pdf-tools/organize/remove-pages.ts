import { PDFDocument } from "pdf-lib";
import { safeLoadPdfDoc } from "../common/safe-pdf-loader.ts";

export type RemoveFilterType = "custom" | "first_page" | "last_page" | "even_pages" | "odd_pages";

export interface RemovePagesOptions {
  pagesToRemove?: string | number[]; // e.g. "2, 4-6" or [2, 4, 5, 6] (1-based)
  filter?: RemoveFilterType;
  onProgress?: (progress: number, status: string) => void;
}

export interface RemovePagesResult {
  pdfBytes: Uint8Array;
  fileName: string;
  originalPages: number;
  removedPagesCount: number;
  remainingPages: number;
  removedPageNumbers: number[]; // 1-based
  summary: string;
}

/**
 * Parses a page removal input string (e.g. "2", "2, 4", "2-5, 8") into a sorted array of 1-based page numbers.
 */
export function parsePagesToRemove(input: string, total: number): number[] {
  if (!input || !input.trim()) return [];
  const pages = new Set<number>();
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((n) => parseInt(n.trim(), 10));
      const start = Math.max(1, Math.min(isNaN(startStr) ? 1 : startStr, total));
      const end = Math.max(start, Math.min(isNaN(endStr) ? total : endStr, total));
      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= total) {
        pages.add(num);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Formats a list of 1-based page numbers into a clean readable range expression (e.g. [2, 3, 4, 6] -> "2-4, 6").
 */
export function formatPagesToRemoveString(pages: number[]): string {
  if (!pages || pages.length === 0) return "";
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

/**
 * Remove specified 1-based page numbers or ranges from a PDF document.
 * Operates 100% in-browser in memory with zero file uploads.
 */
export async function removePagesFromPdf(
  file: File,
  optionsOrInput: string | number[] | RemovePagesOptions = "2"
): Promise<RemovePagesResult> {
  const options: RemovePagesOptions =
    typeof optionsOrInput === "string" || Array.isArray(optionsOrInput)
      ? { pagesToRemove: optionsOrInput }
      : optionsOrInput;

  const onProgress = options.onProgress;
  onProgress?.(10, "Loading PDF document in memory...");

  const pdfDoc = await safeLoadPdfDoc(file);
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error("The selected PDF document contains 0 pages.");
  }

  let targetPages: number[] = [];

  // 1. Check for preset filter
  if (options.filter === "first_page") {
    targetPages = [1];
  } else if (options.filter === "last_page") {
    targetPages = [total];
  } else if (options.filter === "even_pages") {
    targetPages = [];
    for (let p = 2; p <= total; p += 2) targetPages.push(p);
  } else if (options.filter === "odd_pages") {
    targetPages = [];
    for (let p = 1; p <= total; p += 2) targetPages.push(p);
  } else if (Array.isArray(options.pagesToRemove)) {
    targetPages = Array.from(new Set(options.pagesToRemove))
      .filter((p) => typeof p === "number" && p >= 1 && p <= total)
      .sort((a, b) => a - b);
  } else if (typeof options.pagesToRemove === "string") {
    targetPages = parsePagesToRemove(options.pagesToRemove, total);
  }

  // Validation: cannot remove all pages
  if (targetPages.length >= total) {
    throw new Error(
      `Cannot remove all ${total} page(s) from document. At least 1 page must be preserved.`
    );
  }

  onProgress?.(30, `Deleting ${targetPages.length} unwanted page(s)...`);

  // Convert 1-based page numbers to 0-based indices and sort descending
  // Removing from highest index down prevents index shift corruption
  const sorted0BasedDesc = Array.from(new Set(targetPages))
    .map((p) => p - 1)
    .sort((a, b) => b - a);

  let removedCount = 0;
  for (const idx of sorted0BasedDesc) {
    if (idx >= 0 && idx < pdfDoc.getPageCount()) {
      pdfDoc.removePage(idx);
      removedCount++;
    }
  }

  onProgress?.(75, "Optimizing and saving cleaned document...");
  pdfDoc.setProducer("DocDrop 100% In-Browser Memory");
  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const remaining = pdfDoc.getPageCount();

  onProgress?.(100, `Done! Cleaned document has ${remaining} page(s).`);

  return {
    pdfBytes,
    fileName: `${baseName}_pages_removed.pdf`,
    originalPages: total,
    removedPagesCount: removedCount,
    remainingPages: remaining,
    removedPageNumbers: targetPages,
    summary:
      removedCount > 0
        ? `Successfully removed ${removedCount} page(s). Cleaned document now has ${remaining} page(s).`
        : `No pages were removed. Document preserved with all ${total} page(s).`,
  };
}
