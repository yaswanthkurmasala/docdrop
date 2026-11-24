import { loadPdfJs } from "../common/pdfjs-loader.ts";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PageClassification = "digital" | "scanned" | "hybrid" | "blank";

export interface OcrPageAudit {
  pageNumber: number;
  width: number;
  height: number;
  charCount: number;
  wordCount: number;
  lineCount: number;
  fontsUsed: string[];
  isScannedImage: boolean;
  hasRasterImages: boolean;
  rasterImageCount: number;
  classification: PageClassification;
  searchabilityScore: number; // 0 to 100
  textSnippet: string;
  fullText: string;
}

export interface OcrAuditSummary {
  totalPages: number;
  totalWords: number;
  totalChars: number;
  searchabilityScore: number; // 0 to 100
  documentClassification: "Fully Searchable Digital" | "Hybrid Content" | "Scanned Raster (Needs OCR)" | "Blank Document";
  digitalPagesCount: number;
  scannedPagesCount: number;
  hybridPagesCount: number;
  blankPagesCount: number;
  uniqueFonts: string[];
  summaryText: string;
}

export interface OcrAuditResult {
  summary: OcrAuditSummary;
  pages: OcrPageAudit[];
  fullText: string;
  markdownReport: string;
}

export interface OcrAuditOptions {
  mode?: "audit" | "vision" | "searchable_pdf";
  pageRange?: string; // e.g. "all", "1-3, 5"
  includeDelimiters?: boolean;
  onProgress?: (percent: number, message: string) => void;
  geminiVisionHandler?: (pageNumber: number, imageBase64: string) => Promise<string>;
}

/**
 * Parse page range string (e.g. "1-3, 5, 8-10") into 1-based page numbers
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === "all") {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const selected = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          selected.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        selected.add(num);
      }
    }
  }

  const res = Array.from(selected).sort((a, b) => a - b);
  return res.length > 0 ? res : Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Deep audit and extraction of selectable OCR text layers and font structures in-browser
 */
export async function auditPdfTextLayer(
  file: File,
  options?: OcrAuditOptions
): Promise<OcrAuditResult> {
  const onProgress = options?.onProgress;
  onProgress?.(5, "Initializing in-browser PDF.js parser...");

  const pdfjs = await loadPdfJs();
  const rawBuffer = await file.arrayBuffer();
  // Clone buffer to avoid any detachment issues
  const bufferCopy = rawBuffer.slice(0);

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bufferCopy),
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  const targetPages = parsePageRange(options?.pageRange || "all", totalPages);
  const targetSet = new Set(targetPages);

  const pagesAudit: OcrPageAudit[] = [];
  const uniqueFontsSet = new Set<string>();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const percent = Math.round(10 + (pageNum / totalPages) * 75);
    onProgress?.(percent, `Auditing text layers on page ${pageNum} of ${totalPages}...`);

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    // 1. Text Content Stream Analysis
    const textContent = await page.getTextContent();
    const pageFonts = new Set<string>();
    const textLines: string[] = [];
    let currentLine = "";
    let lastY: number | null = null;

    for (const item of textContent.items as any[]) {
      if (!item || typeof item.str !== "string") continue;
      const str = item.str;

      // Extract font info if present
      if (item.fontName) {
        const style = textContent.styles?.[item.fontName];
        const fontName = style?.fontFamily || item.fontName;
        // Clean up internal font hashes (e.g. "g_d0_f1" or "BAAAAA+Arial")
        const cleanFont = fontName.replace(/^[A-Z]{6}\+/, "").trim();
        if (cleanFont) {
          pageFonts.add(cleanFont);
          uniqueFontsSet.add(cleanFont);
        }
      }

      // Group into lines based on Y transform
      const y = item.transform ? Math.round(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) textLines.push(currentLine.trim());
        currentLine = str;
      } else {
        currentLine += (currentLine.length > 0 ? " " : "") + str;
      }
      if (y !== null) lastY = y;
    }
    if (currentLine.trim()) textLines.push(currentLine.trim());

    const fullPageText = textLines.join("\n").trim();
    const charCount = fullPageText.length;
    const wordCount = fullPageText.split(/\s+/).filter(Boolean).length;
    const lineCount = textLines.length;

    // 2. Raster Operator List Inspection (detect scans vs digital graphics)
    let rasterImageCount = 0;
    try {
      const opList = await page.getOperatorList();
      if (opList && opList.fnArray) {
        const ops = (pdfjs as any).OPS;
        if (ops) {
          for (let f = 0; f < opList.fnArray.length; f++) {
            const fn = opList.fnArray[f];
            if (
              fn === ops.paintImageXObject ||
              fn === ops.paintInlineImageXObject ||
              fn === ops.paintImageMaskXObject
            ) {
              rasterImageCount++;
            }
          }
        }
      }
    } catch {
      // Operator inspection fallback
    }

    // 3. Classify Page
    let classification: PageClassification = "digital";
    let isScannedImage = false;
    let searchabilityScore = 0;

    if (charCount === 0 && rasterImageCount === 0) {
      classification = "blank";
      searchabilityScore = 0;
    } else if (charCount < 40 && rasterImageCount > 0) {
      classification = "scanned";
      isScannedImage = true;
      searchabilityScore = Math.max(0, Math.min(25, charCount));
    } else if (charCount >= 40 && rasterImageCount > 0) {
      classification = "hybrid";
      searchabilityScore = Math.min(100, Math.round(70 + (charCount / 500) * 20));
    } else if (charCount >= 40) {
      classification = "digital";
      searchabilityScore = Math.min(100, Math.round(85 + (charCount / 300) * 15));
    } else {
      classification = "scanned";
      isScannedImage = true;
      searchabilityScore = 20;
    }

    // 4. Vision OCR hook if in Vision mode and page is in target range and scanned/sparse
    let finalPageText = fullPageText;
    if (
      options?.mode === "vision" &&
      targetSet.has(pageNum) &&
      options.geminiVisionHandler &&
      (isScannedImage || charCount < 30)
    ) {
      try {
        onProgress?.(
          percent,
          `Invoking Gemini 2.5 Flash Vision OCR for scanned page ${pageNum}...`
        );
        // Render 2x canvas for vision OCR
        if (typeof document !== "undefined") {
          const vScale = 2.0;
          const vPort = page.getViewport({ scale: vScale });
          const canvas = document.createElement("canvas");
          canvas.width = vPort.width;
          canvas.height = vPort.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await (page.render({ canvasContext: ctx as any, viewport: vPort, canvas } as any) as any).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            const visionText = await options.geminiVisionHandler(pageNum, dataUrl);
            if (visionText && visionText.trim()) {
              finalPageText = visionText.trim();
              classification = "scanned";
              searchabilityScore = 95; // Vision OCR has resolved the page
            }
          }
        }
      } catch (visionErr) {
        console.warn(`Vision OCR fallback failed for page ${pageNum}:`, visionErr);
      }
    }

    const snippet = finalPageText.slice(0, 160).replace(/\s+/g, " ").trim();

    pagesAudit.push({
      pageNumber: pageNum,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      charCount: finalPageText.length,
      wordCount: finalPageText.split(/\s+/).filter(Boolean).length,
      lineCount: finalPageText ? finalPageText.split("\n").length : 0,
      fontsUsed: Array.from(pageFonts),
      isScannedImage,
      hasRasterImages: rasterImageCount > 0,
      rasterImageCount,
      classification,
      searchabilityScore,
      textSnippet: snippet || (isScannedImage ? "[Scanned image: No selectable text stream]" : "[Empty page]"),
      fullText: finalPageText,
    });
  }

  onProgress?.(90, "Synthesizing document audit metrics & reports...");

  // Calculate Overall Summary
  const totalWords = pagesAudit.reduce((acc, p) => acc + p.wordCount, 0);
  const totalChars = pagesAudit.reduce((acc, p) => acc + p.charCount, 0);
  const digitalPages = pagesAudit.filter((p) => p.classification === "digital").length;
  const scannedPages = pagesAudit.filter((p) => p.classification === "scanned").length;
  const hybridPages = pagesAudit.filter((p) => p.classification === "hybrid").length;
  const blankPages = pagesAudit.filter((p) => p.classification === "blank").length;

  const avgSearchability = Math.round(
    pagesAudit.reduce((acc, p) => acc + p.searchabilityScore, 0) / (totalPages || 1)
  );

  let documentClassification: OcrAuditSummary["documentClassification"] = "Fully Searchable Digital";
  if (blankPages === totalPages) {
    documentClassification = "Blank Document";
  } else if (scannedPages === totalPages) {
    documentClassification = "Scanned Raster (Needs OCR)";
  } else if (scannedPages > 0 || hybridPages > 0) {
    documentClassification = "Hybrid Content";
  }

  const summaryText =
    documentClassification === "Fully Searchable Digital"
      ? `Audit Complete: All ${totalPages} pages contain high-fidelity digital vector text layers (${totalWords.toLocaleString()} words). 100% searchable without external OCR.`
      : documentClassification === "Scanned Raster (Needs OCR)"
      ? `Audit Complete: Document consists of scanned raster images across ${totalPages} pages. No native font streams detected; OCR text injection or Vision OCR is required for indexing.`
      : `Audit Complete: Hybrid document with ${digitalPages} digital vector pages and ${scannedPages} scanned raster pages (${totalWords.toLocaleString()} extractable words).`;

  const summary: OcrAuditSummary = {
    totalPages,
    totalWords,
    totalChars,
    searchabilityScore: avgSearchability,
    documentClassification,
    digitalPagesCount: digitalPages,
    scannedPagesCount: scannedPages,
    hybridPagesCount: hybridPages,
    blankPagesCount: blankPages,
    uniqueFonts: Array.from(uniqueFontsSet),
    summaryText,
  };

  // Compile full text and Markdown report
  const textBlocks: string[] = [];
  const mdSections: string[] = [];

  mdSections.push(`# OCR Text Layer Audit & Extraction Report`);
  mdSections.push(`**File:** \`${file.name}\`  `);
  mdSections.push(`**Status:** ${documentClassification} (${avgSearchability}% Searchability Score)  `);
  mdSections.push(`**Total Pages:** ${totalPages} | **Total Words:** ${totalWords.toLocaleString()} | **Unique Fonts:** ${uniqueFontsSet.size}  \n`);
  mdSections.push(`---\n`);

  for (const page of pagesAudit) {
    textBlocks.push(`--- Page ${page.pageNumber} (${page.classification.toUpperCase()} • ${page.wordCount} words) ---\n` + page.fullText);

    mdSections.push(`### Page ${page.pageNumber} [${page.classification.toUpperCase()} • ${page.searchabilityScore}% Searchable]`);
    mdSections.push(`- **Dimensions:** ${page.width} × ${page.height} pt`);
    mdSections.push(`- **Words:** ${page.wordCount} | **Chars:** ${page.charCount} | **Raster Objects:** ${page.rasterImageCount}`);
    if (page.fontsUsed.length > 0) {
      mdSections.push(`- **Fonts:** \`${page.fontsUsed.join("`, `")}\``);
    }
    mdSections.push(`\n\`\`\`text\n${page.fullText || "(No selectable text on this page)"}\n\`\`\`\n`);
  }

  onProgress?.(100, "Audit completed successfully.");

  return {
    summary,
    pages: pagesAudit,
    fullText: textBlocks.join("\n\n"),
    markdownReport: mdSections.join("\n"),
  };
}

/**
 * Creates a compliant Searchable PDF (Sandwich PDF) with invisible text layer overlay
 * Allows Ctrl+F search, cursor selection, and copying text from scanned documents!
 */
export async function createSearchablePdf(
  file: File,
  pagesText: string[],
  options?: {
    invisible?: boolean;
    onProgress?: (percent: number, message: string) => void;
  }
): Promise<{ pdfBytes: Uint8Array; fileName: string }> {
  const onProgress = options?.onProgress;
  onProgress?.(10, "Loading PDF for text layer injection...");

  const rawBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(rawBytes.slice(0));
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPages = pdfDoc.getPageCount();

  const invisible = options?.invisible !== false; // default true

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    const progress = Math.round(20 + ((i + 1) / totalPages) * 70);
    onProgress?.(progress, `Overlaying searchable text layer on page ${pageNum} of ${totalPages}...`);

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const text = pagesText[i] || "";

    if (!text.trim()) continue;

    // Split into lines
    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const fontSize = 10;
    const lineHeight = 14;
    const marginX = 40;
    let currentY = height - 50;

    for (const line of rawLines) {
      if (currentY < 40) break; // keep within page bounds

      // Truncate line if it exceeds page width
      let safeLine = line;
      while (safeLine.length > 0 && font.widthOfTextAtSize(safeLine, fontSize) > (width - marginX * 2)) {
        safeLine = safeLine.slice(0, -3) + "...";
      }

      // Draw invisible text (opacity 0)
      page.drawText(safeLine, {
        x: marginX,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        opacity: invisible ? 0 : 0.85,
      });

      currentY -= lineHeight;
    }
  }

  onProgress?.(95, "Serializing searchable PDF binary in-browser...");
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, "Searchable PDF ready.");

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_searchable.pdf`,
  };
}

/**
 * Backward-compatible helper for legacy callers
 */
export async function extractOcrLayer(file: File): Promise<{
  text: string;
  pages: string[];
  hasDigitalLayer: boolean;
  wordCount: number;
  summary: string;
  auditResult?: OcrAuditResult;
}> {
  const audit = await auditPdfTextLayer(file);
  const pages = audit.pages.map((p) => p.fullText);

  return {
    text: audit.fullText,
    pages,
    hasDigitalLayer: audit.summary.searchabilityScore > 30,
    wordCount: audit.summary.totalWords,
    summary: audit.summary.summaryText,
    auditResult: audit,
  };
}
