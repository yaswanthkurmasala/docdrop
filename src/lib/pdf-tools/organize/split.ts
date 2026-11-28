import { PDFDocument } from "pdf-lib";
import { ensureCleanPdfBytes } from "../common/safe-pdf-loader.ts";

export type SplitMode = "range" | "extract_all" | "split_every" | "multi_range";

export interface SplitRangeItem {
  id?: string;
  name?: string;
  from: number; // 1-based inclusive
  to: number;   // 1-based inclusive
}

export interface SplitOptions {
  mode?: SplitMode;
  rangeInput?: string;                // e.g. "1-2, 4" or "1, 3, 5"
  selectedPages?: number[];           // 1-based page numbers selected visually, e.g. [1, 2, 4]
  splitEvery?: number;                // e.g. 1 (each page), 2, 5
  multiRanges?: SplitRangeItem[];     // list of range groups
  mergeIntoSingle?: boolean;          // if false in range mode, each selected page is an independent PDF inside a ZIP
  onProgress?: (progress: number, status: string) => void;
}

export interface SplitPartInfo {
  name: string;
  pageCount: number;
  sizeBytes: number;
}

export interface SplitResult {
  pdfBytes?: Uint8Array;
  zipBlob?: Blob;
  fileName: string;
  pageCount: number;
  splitFilesCount: number;
  type: "pdf" | "zip";
  summary: string;
  parts?: SplitPartInfo[];
}

/**
 * Parses a page range string (e.g. "1-2, 4, 6-8") into a sorted array of 0-based page indices.
 */
export function parseRangeToIndices(rangeInput: string, total: number): number[] {
  const pagesToExtract = new Set<number>();
  const parts = rangeInput.split(",").map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    for (let i = 0; i < total; i++) pagesToExtract.add(i);
  } else {
    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-").map((n) => parseInt(n.trim(), 10));
        const start = Math.max(1, Math.min(isNaN(startStr) ? 1 : startStr, total));
        const end = Math.max(start, Math.min(isNaN(endStr) ? total : endStr, total));
        for (let i = start; i <= end; i++) {
          pagesToExtract.add(i - 1);
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= total) {
          pagesToExtract.add(pageNum - 1);
        }
      }
    }
  }

  return Array.from(pagesToExtract).sort((a, b) => a - b);
}

/**
 * Formats a list of 1-based page numbers into a clean readable range string (e.g. [1, 2, 3, 5] -> "1-3, 5")
 */
export function formatPagesToRange(pages: number[]): string {
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
 * Dynamic loader for JSZip ensuring full compatibility in both browser and Node.js environments
 */
async function getJsZip() {
  const jszipModule = await import("jszip");
  return (jszipModule as any).default || jszipModule;
}

/**
 * Split PDF document with advanced modes:
 * - "range": Extracts selected pages into a single PDF or individual PDFs in a ZIP
 * - "extract_all": Extracts every single page into an independent PDF inside a ZIP
 * - "split_every": Splits document every N pages into separate batch PDFs inside a ZIP
 * - "multi_range": Splits by custom range groups into separate named PDFs inside a ZIP
 */
export async function splitPdf(
  file: File,
  optionsOrRange: string | SplitOptions = "1-2"
): Promise<SplitResult> {
  const options: SplitOptions =
    typeof optionsOrRange === "string"
      ? { mode: "range", rangeInput: optionsOrRange, mergeIntoSingle: true }
      : { mode: "range", mergeIntoSingle: true, ...optionsOrRange };

  const mode = options.mode || "range";
  const onProgress = options.onProgress;
  onProgress?.(5, "Loading source PDF document...");

  const { bytes } = await ensureCleanPdfBytes(file, file.name);
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();

  if (total === 0) {
    throw new Error("The selected PDF document contains 0 pages.");
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  // -------------------------------------------------------------
  // MODE 1: EXTRACT ALL PAGES INTO INDIVIDUAL STANDALONE PDFS
  // -------------------------------------------------------------
  if (mode === "extract_all") {
    onProgress?.(15, `Extracting ${total} individual pages...`);

    // If only 1 page in document, return as single PDF
    if (total === 1) {
      const newDoc = await PDFDocument.create();
      const [copied] = await newDoc.copyPages(srcDoc, [0]);
      newDoc.addPage(copied);
      newDoc.setTitle(`${baseName} - Page 1`);
      newDoc.setProducer("DocDrop 100% In-Browser Memory");
      const pdfBytes = await newDoc.save();

      return {
        pdfBytes,
        fileName: `${baseName}_page_1.pdf`,
        pageCount: 1,
        splitFilesCount: 1,
        type: "pdf",
        summary: "Extracted 1 page as a standalone PDF.",
        parts: [{ name: `${baseName}_page_1.pdf`, pageCount: 1, sizeBytes: pdfBytes.byteLength }],
      };
    }

    const JSZip = await getJsZip();
    const zip = new JSZip();
    const parts: SplitPartInfo[] = [];

    const padLength = Math.max(2, String(total).length);
    for (let i = 0; i < total; i++) {
      const pageNumStr = String(i + 1).padStart(padLength, "0");
      const partDoc = await PDFDocument.create();
      const [copied] = await partDoc.copyPages(srcDoc, [i]);
      partDoc.addPage(copied);
      partDoc.setTitle(`${baseName} - Page ${i + 1}`);
      partDoc.setProducer("DocDrop 100% In-Browser Memory");

      const partBytes = await partDoc.save();
      const partFileName = `${baseName}_page_${pageNumStr}.pdf`;
      zip.file(partFileName, partBytes);

      parts.push({
        name: partFileName,
        pageCount: 1,
        sizeBytes: partBytes.byteLength,
      });

      const currentProgress = Math.round(15 + ((i + 1) / total) * 70);
      onProgress?.(currentProgress, `Extracted page ${i + 1} of ${total}...`);
    }

    onProgress?.(90, "Packaging individual PDFs into ZIP archive...");
    let zipBlob: Blob;
    if (typeof window !== "undefined") {
      zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    } else {
      const nodeBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      zipBlob = new Blob([nodeBuf], { type: "application/zip" });
    }

    onProgress?.(100, `Done! Extracted ${total} pages into ZIP.`);
    return {
      zipBlob,
      fileName: `${baseName}_all_pages.zip`,
      pageCount: total,
      splitFilesCount: total,
      type: "zip",
      summary: `Successfully split ${total} pages into ${total} independent PDF files.`,
      parts,
    };
  }

  // -------------------------------------------------------------
  // MODE 2: SPLIT EVERY N PAGES (BATCH CHUNKS)
  // -------------------------------------------------------------
  if (mode === "split_every") {
    const batchSize = Math.max(1, options.splitEvery || 1);
    const totalBatches = Math.ceil(total / batchSize);

    onProgress?.(15, `Splitting into ${totalBatches} documents (${batchSize} pages per file)...`);

    if (totalBatches === 1) {
      // Return single document
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(srcDoc, Array.from({ length: total }, (_, i) => i));
      copied.forEach((p) => newDoc.addPage(p));
      const pdfBytes = await newDoc.save();

      return {
        pdfBytes,
        fileName: `${baseName}_split.pdf`,
        pageCount: total,
        splitFilesCount: 1,
        type: "pdf",
        summary: `Document kept as 1 file (${total} pages).`,
        parts: [{ name: `${baseName}_split.pdf`, pageCount: total, sizeBytes: pdfBytes.byteLength }],
      };
    }

    const JSZip = await getJsZip();
    const zip = new JSZip();
    const parts: SplitPartInfo[] = [];

    const padLength = Math.max(2, String(totalBatches).length);
    for (let b = 0; b < totalBatches; b++) {
      const startPage = b * batchSize;
      const endPage = Math.min(startPage + batchSize, total);
      const batchIndices = [];
      for (let p = startPage; p < endPage; p++) batchIndices.push(p);

      const partDoc = await PDFDocument.create();
      const copied = await partDoc.copyPages(srcDoc, batchIndices);
      copied.forEach((page) => partDoc.addPage(page));
      partDoc.setTitle(`${baseName} - Part ${b + 1}`);
      partDoc.setProducer("DocDrop 100% In-Browser Memory");

      const partBytes = await partDoc.save();
      const batchNumStr = String(b + 1).padStart(padLength, "0");
      const partFileName = `${baseName}_part_${batchNumStr}_pg${startPage + 1}-${endPage}.pdf`;
      zip.file(partFileName, partBytes);

      parts.push({
        name: partFileName,
        pageCount: copied.length,
        sizeBytes: partBytes.byteLength,
      });

      const currentProgress = Math.round(15 + ((b + 1) / totalBatches) * 70);
      onProgress?.(currentProgress, `Generated batch ${b + 1} of ${totalBatches}...`);
    }

    onProgress?.(90, "Packaging batches into ZIP archive...");
    let zipBlob: Blob;
    if (typeof window !== "undefined") {
      zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    } else {
      const nodeBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      zipBlob = new Blob([nodeBuf], { type: "application/zip" });
    }

    onProgress?.(100, `Done! Created ${totalBatches} batch files.`);
    return {
      zipBlob,
      fileName: `${baseName}_split_batches.zip`,
      pageCount: total,
      splitFilesCount: totalBatches,
      type: "zip",
      summary: `Split ${total} pages into ${totalBatches} files (${batchSize} pages per document).`,
      parts,
    };
  }

  // -------------------------------------------------------------
  // MODE 3: MULTI-RANGE SPLIT (CUSTOM RANGE GROUPS)
  // -------------------------------------------------------------
  if (mode === "multi_range" && options.multiRanges && options.multiRanges.length > 0) {
    const validRanges = options.multiRanges.filter(
      (r) => r.from >= 1 && r.to >= r.from && r.from <= total
    );

    if (validRanges.length === 0) {
      throw new Error(`Please specify at least one valid page range between 1 and ${total}.`);
    }

    if (validRanges.length === 1 && options.mergeIntoSingle !== false) {
      // Single range to single PDF
      const r = validRanges[0];
      const indices: number[] = [];
      const end = Math.min(r.to, total);
      for (let p = r.from; p <= end; p++) indices.push(p - 1);

      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => newDoc.addPage(p));
      const pdfBytes = await newDoc.save();

      return {
        pdfBytes,
        fileName: `${baseName}_${r.name || `pg${r.from}-${end}`}.pdf`,
        pageCount: copied.length,
        splitFilesCount: 1,
        type: "pdf",
        summary: `Extracted ${copied.length} page(s) from range ${r.from}-${end}.`,
        parts: [{ name: `${baseName}_range.pdf`, pageCount: copied.length, sizeBytes: pdfBytes.byteLength }],
      };
    }

    const JSZip = await getJsZip();
    const zip = new JSZip();
    const parts: SplitPartInfo[] = [];

    for (let idx = 0; idx < validRanges.length; idx++) {
      const r = validRanges[idx];
      const start = Math.max(1, r.from);
      const end = Math.min(r.to, total);
      const indices: number[] = [];
      for (let p = start; p <= end; p++) indices.push(p - 1);

      const partDoc = await PDFDocument.create();
      const copied = await partDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => partDoc.addPage(p));
      partDoc.setTitle(`${baseName} - ${r.name || `Range ${idx + 1}`}`);
      partDoc.setProducer("DocDrop 100% In-Browser Memory");

      const partBytes = await partDoc.save();
      const safeName = (r.name || `range_${idx + 1}_pg${start}-${end}`).replace(/[^a-zA-Z0-9_-]/g, "_");
      const partFileName = `${baseName}_${safeName}.pdf`;
      zip.file(partFileName, partBytes);

      parts.push({
        name: partFileName,
        pageCount: copied.length,
        sizeBytes: partBytes.byteLength,
      });

      const currentProgress = Math.round(15 + ((idx + 1) / validRanges.length) * 70);
      onProgress?.(currentProgress, `Extracted range ${idx + 1} of ${validRanges.length}...`);
    }

    onProgress?.(90, "Packaging range documents into ZIP archive...");
    let zipBlob: Blob;
    if (typeof window !== "undefined") {
      zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    } else {
      const nodeBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      zipBlob = new Blob([nodeBuf], { type: "application/zip" });
    }

    onProgress?.(100, `Done! Extracted ${validRanges.length} range documents.`);
    return {
      zipBlob,
      fileName: `${baseName}_ranges.zip`,
      pageCount: parts.reduce((acc, p) => acc + p.pageCount, 0),
      splitFilesCount: validRanges.length,
      type: "zip",
      summary: `Extracted ${validRanges.length} custom range documents into ZIP archive.`,
      parts,
    };
  }

  // -------------------------------------------------------------
  // MODE 4: RANGE OR VISUALLY SELECTED PAGES (DEFAULT)
  // -------------------------------------------------------------
  let sortedIndices: number[] = [];

  if (options.selectedPages && options.selectedPages.length > 0) {
    sortedIndices = Array.from(new Set(options.selectedPages))
      .filter((p) => p >= 1 && p <= total)
      .map((p) => p - 1)
      .sort((a, b) => a - b);
  } else if (options.rangeInput) {
    sortedIndices = parseRangeToIndices(options.rangeInput, total);
  } else {
    // Default to first page
    sortedIndices = [0];
  }

  if (sortedIndices.length === 0) {
    throw new Error(`Invalid range. Document has ${total} page(s). Please specify numbers between 1 and ${total}.`);
  }

  // Check whether to extract each selected page as an individual PDF into a ZIP
  if (options.mergeIntoSingle === false && sortedIndices.length > 1) {
    onProgress?.(20, `Extracting ${sortedIndices.length} individual pages...`);
    const JSZip = await getJsZip();
    const zip = new JSZip();
    const parts: SplitPartInfo[] = [];

    const padLength = Math.max(2, String(total).length);
    for (let idx = 0; idx < sortedIndices.length; idx++) {
      const pageIdx = sortedIndices[idx];
      const pageNumStr = String(pageIdx + 1).padStart(padLength, "0");
      const partDoc = await PDFDocument.create();
      const [copied] = await partDoc.copyPages(srcDoc, [pageIdx]);
      partDoc.addPage(copied);
      partDoc.setTitle(`${baseName} - Page ${pageIdx + 1}`);
      partDoc.setProducer("DocDrop 100% In-Browser Memory");

      const partBytes = await partDoc.save();
      const partFileName = `${baseName}_page_${pageNumStr}.pdf`;
      zip.file(partFileName, partBytes);

      parts.push({
        name: partFileName,
        pageCount: 1,
        sizeBytes: partBytes.byteLength,
      });

      const currentProgress = Math.round(20 + ((idx + 1) / sortedIndices.length) * 65);
      onProgress?.(currentProgress, `Extracted page ${pageIdx + 1} (${idx + 1}/${sortedIndices.length})...`);
    }

    onProgress?.(90, "Packaging individual files into ZIP archive...");
    let zipBlob: Blob;
    if (typeof window !== "undefined") {
      zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    } else {
      const nodeBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      zipBlob = new Blob([nodeBuf], { type: "application/zip" });
    }

    onProgress?.(100, `Done! Extracted ${sortedIndices.length} individual files.`);
    return {
      zipBlob,
      fileName: `${baseName}_selected_pages.zip`,
      pageCount: sortedIndices.length,
      splitFilesCount: sortedIndices.length,
      type: "zip",
      summary: `Extracted ${sortedIndices.length} selected pages into independent PDF files in ZIP.`,
      parts,
    };
  }

  // Standard: Merge selected pages into 1 single PDF file
  onProgress?.(30, `Copying ${sortedIndices.length} page(s) into new document...`);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, sortedIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  newDoc.setTitle(`${baseName} (Split)`);
  newDoc.setProducer("DocDrop 100% In-Browser Memory");

  onProgress?.(80, "Serializing PDF bytes...");
  const pdfBytes = await newDoc.save();

  onProgress?.(100, `Extracted ${copiedPages.length} page(s) successfully.`);
  return {
    pdfBytes,
    fileName: `${baseName}_split.pdf`,
    pageCount: copiedPages.length,
    splitFilesCount: 1,
    type: "pdf",
    summary: `Extracted ${copiedPages.length} page(s) into a unified PDF document.`,
    parts: [
      {
        name: `${baseName}_split.pdf`,
        pageCount: copiedPages.length,
        sizeBytes: pdfBytes.byteLength,
      },
    ],
  };
}
