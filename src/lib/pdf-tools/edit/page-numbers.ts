import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

export type PageNumberFormat =
  | "page_of_total"       // Page 1 of 12
  | "number_slash_total"  // 1 / 12
  | "number_only"         // 1
  | "hyphen_number"       // - 1 -
  | "roman_lower"         // i, ii, iii
  | "roman_upper"         // I, II, III
  | "custom";             // {prefix} 1 {suffix}

export type PageNumberFont = "helvetica" | "times" | "courier";

export type PageNumberColor = "dark" | "gray" | "blue" | "crimson" | "amber";

export type PageNumberScope = "all" | "exclude_first" | "custom";

export type PageNumberStyle = "plain" | "pill_badge" | "accent_line";

export interface PageNumberPreset {
  id: string;
  name: string;
  format: PageNumberFormat;
  position: PageNumberPosition;
  style: PageNumberStyle;
  facingPages?: boolean;
  skipCover?: boolean;
}

export const PAGE_NUMBER_PRESETS: PageNumberPreset[] = [
  {
    id: "classic_bottom_center",
    name: "Classic Footer",
    format: "page_of_total",
    position: "bottom-center",
    style: "plain",
    skipCover: false,
  },
  {
    id: "modern_slash_right",
    name: "Modern Bottom Right",
    format: "number_slash_total",
    position: "bottom-right",
    style: "plain",
    skipCover: false,
  },
  {
    id: "formal_header",
    name: "Top Right Header",
    format: "page_of_total",
    position: "top-right",
    style: "accent_line",
    skipCover: true,
  },
  {
    id: "facing_book",
    name: "Facing Book Binding",
    format: "page_of_total",
    position: "bottom-right",
    style: "plain",
    facingPages: true,
    skipCover: true,
  },
  {
    id: "pill_badge_center",
    name: "Pill Tag Badge",
    format: "number_slash_total",
    position: "bottom-center",
    style: "pill_badge",
    skipCover: false,
  },
  {
    id: "legal_roman",
    name: "Legal Roman Numeral",
    format: "roman_upper",
    position: "bottom-center",
    style: "plain",
    skipCover: false,
  },
];

export interface PageNumberOptions {
  position?: PageNumberPosition;
  format?: PageNumberFormat;
  fontFamily?: PageNumberFont;
  fontSize?: number; // default 10
  color?: PageNumberColor;
  style?: PageNumberStyle;
  facingPages?: boolean; // Alternating odd=right, even=left
  skipCover?: boolean; // Skip page 1
  startNumber?: number; // default 1
  pageScope?: PageNumberScope;
  customPages?: string | number[]; // e.g. "2-5, 8"
  margin?: number; // points from edge (default 26)
  customPrefix?: string; // e.g. "DocDrop • Page"
  customSuffix?: string; // e.g. "• Confidential"
  onProgress?: (progress: number, status: string) => void;
}

export interface PageNumberResult {
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
  pagesNumbered: number[];
  summary: string;
}

/**
 * Converts integer to Roman numerals
 */
function toRoman(num: number, upper = true): string {
  if (num <= 0) return String(num);
  const romanMap: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let res = "";
  let n = num;
  for (const [val, sym] of romanMap) {
    while (n >= val) {
      res += sym;
      n -= val;
    }
  }
  return upper ? res : res.toLowerCase();
}

/**
 * Resolves color
 */
function getPageNumberRgb(color: PageNumberColor = "dark") {
  switch (color) {
    case "gray":
      return { text: rgb(0.44, 0.46, 0.48), bg: rgb(0.95, 0.95, 0.96), line: rgb(0.85, 0.85, 0.88) };
    case "blue":
      return { text: rgb(0.12, 0.35, 0.85), bg: rgb(0.93, 0.96, 1.0), line: rgb(0.8, 0.88, 0.98) };
    case "crimson":
      return { text: rgb(0.82, 0.12, 0.12), bg: rgb(0.99, 0.93, 0.93), line: rgb(0.96, 0.8, 0.8) };
    case "amber":
      return { text: rgb(0.75, 0.45, 0.05), bg: rgb(1.0, 0.97, 0.91), line: rgb(0.95, 0.88, 0.75) };
    case "dark":
    default:
      return { text: rgb(0.15, 0.16, 0.18), bg: rgb(0.94, 0.94, 0.95), line: rgb(0.88, 0.88, 0.9) };
  }
}

/**
 * Resolves embedded font
 */
async function resolveFont(pdfDoc: PDFDocument, fontFamily: PageNumberFont = "helvetica"): Promise<PDFFont> {
  switch (fontFamily) {
    case "times":
      return await pdfDoc.embedFont(StandardFonts.TimesRoman);
    case "courier":
      return await pdfDoc.embedFont(StandardFonts.Courier);
    case "helvetica":
    default:
      return await pdfDoc.embedFont(StandardFonts.Helvetica);
  }
}

/**
 * Formats page number text according to template
 */
export function formatPageNumberText(
  pageIndex1Based: number,
  totalCount: number,
  format: PageNumberFormat = "page_of_total",
  prefix = "",
  suffix = ""
): string {
  let core = "";
  switch (format) {
    case "number_slash_total":
      core = `${pageIndex1Based} / ${totalCount}`;
      break;
    case "number_only":
      core = `${pageIndex1Based}`;
      break;
    case "hyphen_number":
      core = `- ${pageIndex1Based} -`;
      break;
    case "roman_lower":
      core = `${toRoman(pageIndex1Based, false)} / ${toRoman(totalCount, false)}`;
      break;
    case "roman_upper":
      core = `${toRoman(pageIndex1Based, true)} / ${toRoman(totalCount, true)}`;
      break;
    case "custom":
      core = `${prefix ? prefix + " " : ""}${pageIndex1Based}${suffix ? " " + suffix : ""}`;
      return core;
    case "page_of_total":
    default:
      core = `Page ${pageIndex1Based} of ${totalCount}`;
      break;
  }

  if (prefix) core = `${prefix} ${core}`;
  if (suffix) core = `${core} ${suffix}`;
  return core;
}

/**
 * Parses target pages
 */
export function parseTargetPages(
  totalPages: number,
  scope: PageNumberScope = "all",
  skipCover = false,
  customPages?: string | number[]
): number[] {
  if (totalPages <= 0) return [];

  if (scope === "exclude_first" || skipCover) {
    const list: number[] = [];
    for (let i = 2; i <= totalPages; i++) list.push(i);
    return list;
  }

  if (scope === "custom" && customPages) {
    const input = Array.isArray(customPages) ? customPages.join(",") : String(customPages);
    const pages = new Set<number>();
    const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-").map((n) => parseInt(n.trim(), 10));
        const start = Math.max(1, Math.min(isNaN(startStr) ? 1 : startStr, totalPages));
        const end = Math.max(start, Math.min(isNaN(endStr) ? totalPages : endStr, totalPages));
        for (let i = start; i <= end; i++) pages.add(i);
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          pages.add(num);
        }
      }
    }
    const res = Array.from(pages).sort((a, b) => a - b);
    return res.length > 0 ? res : [1];
  }

  // Default: all pages
  const all: number[] = [];
  for (let i = 1; i <= totalPages; i++) all.push(i);
  return all;
}

/**
 * Add precision page numbers to a PDF document with custom typography, facing page alignment, and styles.
 * 100% client-side in-browser memory execution.
 */
export async function addPageNumbersToPdf(
  file: File,
  optionsOrPosition: PageNumberPosition | PageNumberOptions = "bottom-center"
): Promise<PageNumberResult> {
  const options: PageNumberOptions =
    typeof optionsOrPosition === "string"
      ? { position: optionsOrPosition }
      : optionsOrPosition;

  options.onProgress?.(10, "Loading document in local RAM...");

  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error("Cannot add page numbers to a document with 0 pages.");
  }

  options.onProgress?.(25, "Preparing typography and position layout...");

  const font = await resolveFont(pdfDoc, options.fontFamily);
  const position = options.position || "bottom-center";
  const format = options.format || "page_of_total";
  const fontSize = options.fontSize || 10;
  const colors = getPageNumberRgb(options.color);
  const style = options.style || "plain";
  const margin = options.margin !== undefined ? options.margin : 28;
  const startNum = options.startNumber !== undefined ? options.startNumber : 1;
  const facingPages = Boolean(options.facingPages);
  const skipCover = Boolean(options.skipCover);

  const targetPages = parseTargetPages(total, options.pageScope, skipCover, options.customPages);

  options.onProgress?.(50, `Numbering ${targetPages.length} pages...`);

  const pagesNumbered: number[] = [];

  for (let idx = 0; idx < targetPages.length; idx++) {
    const pageNum = targetPages[idx];
    const page = pdfDoc.getPage(pageNum - 1);
    const { width, height } = page.getSize();

    // Compute display index
    const displayIndex = startNum + (skipCover ? pageNum - 2 : pageNum - 1);
    const text = formatPageNumberText(
      displayIndex,
      total,
      format,
      options.customPrefix,
      options.customSuffix
    );

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Determine effective horizontal alignment (handling facing pages)
    let effectivePos = position;
    if (facingPages) {
      const isOdd = pageNum % 2 !== 0;
      if (position.includes("right") || position.includes("left")) {
        const verticalPart = position.startsWith("top") ? "top" : "bottom";
        effectivePos = isOdd
          ? (`${verticalPart}-right` as PageNumberPosition)
          : (`${verticalPart}-left` as PageNumberPosition);
      }
    }

    // Calculate X coordinate
    let x = (width - textWidth) / 2;
    if (effectivePos.endsWith("left")) {
      x = margin;
    } else if (effectivePos.endsWith("right")) {
      x = width - textWidth - margin;
    }

    // Calculate Y coordinate
    let y = margin;
    if (effectivePos.startsWith("top")) {
      y = height - textHeight - margin;
    }

    // Optional Decorative Styles
    if (style === "pill_badge") {
      const padX = 8;
      const padY = 4;
      const badgeW = textWidth + padX * 2;
      const badgeH = textHeight + padY * 2;

      page.drawRectangle({
        x: x - padX,
        y: y - padY / 2,
        width: badgeW,
        height: badgeH,
        color: colors.bg,
        borderColor: colors.line,
        borderWidth: 0.75,
      });
    } else if (style === "accent_line") {
      // Rule line separating header or footer from body
      const lineY = effectivePos.startsWith("top") ? y - 8 : y + textHeight + 8;
      page.drawLine({
        start: { x: margin, y: lineY },
        end: { x: width - margin, y: lineY },
        thickness: 0.5,
        color: colors.line,
      });
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: colors.text,
    });

    pagesNumbered.push(pageNum);
  }

  options.onProgress?.(85, "Saving numbered document...");

  pdfDoc.setProducer("DocDrop Precision Page Numbering Engine • 100% In-Browser Memory");
  pdfDoc.setCreator("DocDrop Document Studio v2.4");

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  options.onProgress?.(100, "Page numbering complete!");

  return {
    pdfBytes,
    fileName: `${baseName}_numbered.pdf`,
    totalPages: total,
    pagesNumbered,
    summary: `Numbered ${pagesNumbered.length} of ${total} pages at ${position.replace("-", " ")}.`,
  };
}
