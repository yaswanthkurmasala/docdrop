import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export type AnnotateTone =
  | "approved"
  | "rejected"
  | "note"
  | "confidential"
  | "warning"
  | "review";

export type AnnotateStyle =
  | "rubber_stamp"
  | "badge"
  | "callout_box"
  | "highlight_strip"
  | "banner_diagonal";

export type AnnotatePosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type AnnotatePageScope = "all" | "first" | "last" | "custom";

export interface AnnotateOptions {
  text: string;
  subtitle?: string;
  pageNum?: number; // 1-based (legacy / single-page)
  pageScope?: AnnotatePageScope;
  customPages?: string | number[]; // e.g. "1-2, 4"
  position?: AnnotatePosition;
  tone?: AnnotateTone;
  style?: AnnotateStyle;
  rotation?: number; // degrees, e.g. -12, 0, 15, -45
  opacity?: number; // 0.1 to 1.0 (default 0.95)
  includeDate?: boolean;
  onProgress?: (progress: number, status: string) => void;
}

export interface AnnotateResult {
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
  pagesAnnotated: number[];
  stampsApplied: number;
  summary: string;
}

export interface AnnotatePreset {
  id: string;
  name: string;
  text: string;
  subtitle: string;
  tone: AnnotateTone;
  style: AnnotateStyle;
  rotation: number;
}

export const ANNOTATE_PRESETS: AnnotatePreset[] = [
  {
    id: "approved",
    name: "Approved & Certified",
    text: "APPROVED FOR RELEASE",
    subtitle: "DOCDROP AUDIT COMPLIANT",
    tone: "approved",
    style: "rubber_stamp",
    rotation: -12,
  },
  {
    id: "confidential",
    name: "Confidential Document",
    text: "CONFIDENTIAL & PRIVILEGED",
    subtitle: "RESTRICTED ACCESS • DO NOT COPY",
    tone: "confidential",
    style: "rubber_stamp",
    rotation: -12,
  },
  {
    id: "verified",
    name: "Official Verification",
    text: "VERIFIED & AUDITED",
    subtitle: "AUTHENTICITY CONFIRMED",
    tone: "note",
    style: "badge",
    rotation: 0,
  },
  {
    id: "rejected",
    name: "Rejected / Void",
    text: "REJECTED & VOID",
    subtitle: "NON-COMPLIANT SPECIFICATION",
    tone: "rejected",
    style: "rubber_stamp",
    rotation: -15,
  },
  {
    id: "draft",
    name: "Preliminary Draft",
    text: "PRELIMINARY DRAFT",
    subtitle: "FOR INTERNAL REVIEW ONLY",
    tone: "warning",
    style: "rubber_stamp",
    rotation: -12,
  },
  {
    id: "urgent",
    name: "Urgent Review",
    text: "URGENT ACTION REQUIRED",
    subtitle: "COMPLIANCE REVIEW PENDING",
    tone: "rejected",
    style: "callout_box",
    rotation: 0,
  },
];

/**
 * Maps tone names to rich CMYK/RGB matching color palettes
 */
function getToneColors(tone: AnnotateTone = "approved") {
  switch (tone) {
    case "rejected":
      return {
        bg: rgb(0.99, 0.93, 0.93),
        text: rgb(0.82, 0.12, 0.12),
        border: rgb(0.85, 0.2, 0.2),
        accent: rgb(0.95, 0.15, 0.15),
      };
    case "note":
      return {
        bg: rgb(0.93, 0.96, 1.0),
        text: rgb(0.12, 0.35, 0.85),
        border: rgb(0.2, 0.45, 0.9),
        accent: rgb(0.2, 0.5, 0.95),
      };
    case "confidential":
      return {
        bg: rgb(0.95, 0.95, 0.96),
        text: rgb(0.22, 0.25, 0.28),
        border: rgb(0.4, 0.44, 0.48),
        accent: rgb(0.3, 0.33, 0.36),
      };
    case "warning":
      return {
        bg: rgb(1.0, 0.97, 0.91),
        text: rgb(0.75, 0.45, 0.05),
        border: rgb(0.85, 0.55, 0.1),
        accent: rgb(0.95, 0.6, 0.05),
      };
    case "review":
      return {
        bg: rgb(0.97, 0.93, 1.0),
        text: rgb(0.5, 0.15, 0.75),
        border: rgb(0.6, 0.25, 0.85),
        accent: rgb(0.65, 0.2, 0.9),
      };
    case "approved":
    default:
      return {
        bg: rgb(0.92, 0.98, 0.94),
        text: rgb(0.05, 0.55, 0.25),
        border: rgb(0.1, 0.65, 0.3),
        accent: rgb(0.12, 0.7, 0.32),
      };
  }
}

/**
 * Calculates world coordinates (x', y') for local offset (dx, dy) inside an unrotated box (x, y)
 * rotated by angle theta (in degrees) around anchor (x, y)
 */
function rotatePoint(
  x: number,
  y: number,
  dx: number,
  dy: number,
  deg: number
): { x: number; y: number } {
  if (deg === 0) return { x: x + dx, y: y + dy };
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x + dx * cos - dy * sin,
    y: y + dx * sin + dy * cos,
  };
}

/**
 * Parses target pages to annotate based on scope and options
 */
export function parsePagesToAnnotate(
  options: AnnotateOptions,
  totalPages: number
): number[] {
  if (options.pageScope === "first") {
    return [1];
  }
  if (options.pageScope === "last") {
    return [totalPages];
  }
  if (options.pageScope === "custom" && options.customPages) {
    const input = Array.isArray(options.customPages)
      ? options.customPages.join(",")
      : String(options.customPages);
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
  if (options.pageScope === "all") {
    const all: number[] = [];
    for (let i = 1; i <= totalPages; i++) all.push(i);
    return all;
  }
  // Backwards compatibility for single pageNum
  if (options.pageNum !== undefined && !options.pageScope) {
    const p = Math.max(1, Math.min(options.pageNum, totalPages));
    return [p];
  }
  // Default fallback: page 1
  return [1];
}

/**
 * Calculates (x, y) anchor point for 9-grid position
 */
function calculatePosition(
  pos: AnnotatePosition = "top-right",
  pageWidth: number,
  pageHeight: number,
  boxWidth: number,
  boxHeight: number,
  margin = 36
): { x: number; y: number } {
  let x = pageWidth - boxWidth - margin;
  let y = pageHeight - boxHeight - margin;

  switch (pos) {
    case "top-left":
      x = margin;
      y = pageHeight - boxHeight - margin;
      break;
    case "top-center":
      x = (pageWidth - boxWidth) / 2;
      y = pageHeight - boxHeight - margin;
      break;
    case "top-right":
      x = pageWidth - boxWidth - margin;
      y = pageHeight - boxHeight - margin;
      break;
    case "middle-left":
      x = margin;
      y = (pageHeight - boxHeight) / 2;
      break;
    case "center":
      x = (pageWidth - boxWidth) / 2;
      y = (pageHeight - boxHeight) / 2;
      break;
    case "middle-right":
      x = pageWidth - boxWidth - margin;
      y = (pageHeight - boxHeight) / 2;
      break;
    case "bottom-left":
      x = margin;
      y = margin;
      break;
    case "bottom-center":
      x = (pageWidth - boxWidth) / 2;
      y = margin;
      break;
    case "bottom-right":
      x = pageWidth - boxWidth - margin;
      y = margin;
      break;
  }
  return { x, y };
}

/**
 * Annotate / Stamp PDF with precision verification status badges, rubber stamps, and audit callouts.
 * 100% in-browser memory execution with zero cloud file leakage.
 */
export async function annotatePdf(
  file: File,
  options: AnnotateOptions
): Promise<AnnotateResult> {
  options.onProgress?.(10, "Loading PDF in local memory...");

  const buffer = await file.arrayBuffer();
  // Safe buffer slice to ensure memory safety
  const pdfDoc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error("Cannot annotate a PDF with 0 pages.");
  }

  options.onProgress?.(25, "Preparing typography and vector stamps...");

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const rawText = (options.text || "APPROVED").trim();
  const text = rawText.toUpperCase();
  const subtitle = options.subtitle?.trim() || (options.includeDate ? `DOCDROP CERTIFIED • ${new Date().toISOString().slice(0, 10)}` : "");
  const hasSubtitle = Boolean(subtitle);

  const tone = options.tone || "approved";
  const style = options.style || "badge";
  const pos = options.position || "top-right";
  const rotation = options.rotation !== undefined ? options.rotation : (style === "rubber_stamp" ? -12 : style === "banner_diagonal" ? -45 : 0);
  const opacity = Math.max(0.1, Math.min(options.opacity !== undefined ? options.opacity : 0.95, 1.0));

  const colors = getToneColors(tone);

  // Compute text sizing
  const titleFontSize = style === "rubber_stamp" ? 12.5 : style === "banner_diagonal" ? 11 : 11.5;
  const subFontSize = 7.0;

  const textWidth = fontBold.widthOfTextAtSize(text, titleFontSize);
  const subWidth = hasSubtitle ? fontRegular.widthOfTextAtSize(subtitle, subFontSize) : 0;
  const contentWidth = Math.max(textWidth, subWidth);

  // Box dimensions
  let boxWidth = Math.max(contentWidth + 28, style === "rubber_stamp" ? 140 : 120);
  let boxHeight = hasSubtitle ? 42 : 28;

  if (style === "banner_diagonal") {
    boxWidth = Math.max(contentWidth + 36, 150);
    boxHeight = 24;
  }

  // Determine pages to stamp
  const targetPages = parsePagesToAnnotate(options, total);

  options.onProgress?.(50, `Stamping ${targetPages.length} pages...`);

  let stampsCount = 0;

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];
    const page = pdfDoc.getPage(pageNum - 1);
    const { width, height } = page.getSize();

    const { x, y } = calculatePosition(pos, width, height, boxWidth, boxHeight);

    // Render based on style
    if (style === "rubber_stamp") {
      // 1. Outer Box with double border
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: colors.bg,
        borderColor: colors.border,
        borderWidth: 2.2,
        opacity,
        rotate: degrees(rotation),
      });

      // 2. Inner Inset Rectangle (3.5pt inset)
      const inset = 3.5;
      const innerW = boxWidth - inset * 2;
      const innerH = boxHeight - inset * 2;
      const innerPt = rotatePoint(x, y, inset, inset, rotation);

      page.drawRectangle({
        x: innerPt.x,
        y: innerPt.y,
        width: innerW,
        height: innerH,
        borderColor: colors.border,
        borderWidth: 1.0,
        opacity: Math.min(opacity + 0.05, 1.0),
        rotate: degrees(rotation),
      });

      // 3. Primary Title Text (Centered horizontally)
      const titleDx = (boxWidth - textWidth) / 2;
      const titleDy = hasSubtitle ? (boxHeight - titleFontSize) / 2 + 5.5 : (boxHeight - titleFontSize) / 2 + 1;
      const titlePt = rotatePoint(x, y, titleDx, titleDy, rotation);

      page.drawText(text, {
        x: titlePt.x,
        y: titlePt.y,
        size: titleFontSize,
        font: fontBold,
        color: colors.text,
        opacity,
        rotate: degrees(rotation),
      });

      // 4. Subtitle Text (if present)
      if (hasSubtitle) {
        const subDx = (boxWidth - subWidth) / 2;
        const subDy = 7.0;
        const subPt = rotatePoint(x, y, subDx, subDy, rotation);

        page.drawText(subtitle, {
          x: subPt.x,
          y: subPt.y,
          size: subFontSize,
          font: fontRegular,
          color: colors.text,
          opacity: Math.max(0.7, opacity - 0.1),
          rotate: degrees(rotation),
        });
      }
    } else if (style === "callout_box") {
      // Modern Legal Audit Callout with accent left border
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: colors.bg,
        borderColor: colors.border,
        borderWidth: 1.0,
        opacity,
        rotate: degrees(rotation),
      });

      // Left Accent Stripe
      const stripePt = rotatePoint(x, y, 0, 0, rotation);
      page.drawRectangle({
        x: stripePt.x,
        y: stripePt.y,
        width: 4.5,
        height: boxHeight,
        color: colors.accent,
        opacity,
        rotate: degrees(rotation),
      });

      // Text elements (Left-aligned + 12pt)
      const titleDx = 14;
      const titleDy = hasSubtitle ? (boxHeight - titleFontSize) / 2 + 5 : (boxHeight - titleFontSize) / 2 + 1;
      const titlePt = rotatePoint(x, y, titleDx, titleDy, rotation);

      page.drawText(text, {
        x: titlePt.x,
        y: titlePt.y,
        size: titleFontSize,
        font: fontBold,
        color: colors.text,
        opacity,
        rotate: degrees(rotation),
      });

      if (hasSubtitle) {
        const subPt = rotatePoint(x, y, 14, 6.5, rotation);
        page.drawText(subtitle, {
          x: subPt.x,
          y: subPt.y,
          size: subFontSize,
          font: fontRegular,
          color: colors.text,
          opacity: Math.max(0.65, opacity - 0.15),
          rotate: degrees(rotation),
        });
      }
    } else if (style === "highlight_strip") {
      // Translucent Highlighter Banner
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: colors.accent,
        opacity: Math.min(opacity * 0.35, 0.45),
        rotate: degrees(rotation),
      });

      const titleDx = (boxWidth - textWidth) / 2;
      const titleDy = (boxHeight - titleFontSize) / 2 + 1;
      const titlePt = rotatePoint(x, y, titleDx, titleDy, rotation);

      page.drawText(text, {
        x: titlePt.x,
        y: titlePt.y,
        size: titleFontSize,
        font: fontBold,
        color: colors.text,
        opacity,
        rotate: degrees(rotation),
      });
    } else if (style === "banner_diagonal") {
      // Corner Ribbon Banner
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: colors.accent,
        borderColor: colors.border,
        borderWidth: 1.0,
        opacity,
        rotate: degrees(rotation),
      });

      const titleDx = (boxWidth - textWidth) / 2;
      const titleDy = (boxHeight - titleFontSize) / 2 + 1;
      const titlePt = rotatePoint(x, y, titleDx, titleDy, rotation);

      page.drawText(text, {
        x: titlePt.x,
        y: titlePt.y,
        size: titleFontSize,
        font: fontBold,
        color: rgb(1, 1, 1),
        opacity: 1.0,
        rotate: degrees(rotation),
      });
    } else {
      // Default: "badge" (Modern Pill Badge)
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: colors.bg,
        borderColor: colors.border,
        borderWidth: 1.5,
        opacity,
        rotate: degrees(rotation),
      });

      const titleDx = (boxWidth - textWidth) / 2;
      const titleDy = hasSubtitle ? (boxHeight - titleFontSize) / 2 + 5.5 : (boxHeight - titleFontSize) / 2 + 1;
      const titlePt = rotatePoint(x, y, titleDx, titleDy, rotation);

      page.drawText(text, {
        x: titlePt.x,
        y: titlePt.y,
        size: titleFontSize,
        font: fontBold,
        color: colors.text,
        opacity,
        rotate: degrees(rotation),
      });

      if (hasSubtitle) {
        const subDx = (boxWidth - subWidth) / 2;
        const subDy = 7.0;
        const subPt = rotatePoint(x, y, subDx, subDy, rotation);

        page.drawText(subtitle, {
          x: subPt.x,
          y: subPt.y,
          size: subFontSize,
          font: fontRegular,
          color: colors.text,
          opacity: Math.max(0.7, opacity - 0.1),
          rotate: degrees(rotation),
        });
      }
    }

    stampsCount++;
  }

  options.onProgress?.(85, "Saving annotated PDF in memory...");

  pdfDoc.setProducer("DocDrop Precision Annotation Engine • 100% In-Browser Memory");
  pdfDoc.setCreator("DocDrop Document Studio v2.4");

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  options.onProgress?.(100, "Annotation complete!");

  return {
    pdfBytes,
    fileName: `${baseName}_annotated.pdf`,
    totalPages: total,
    pagesAnnotated: targetPages,
    stampsApplied: stampsCount,
    summary: `Stamped ${stampsCount} ${style.replace("_", " ")} badge(s) on ${targetPages.length} page(s).`,
  };
}
