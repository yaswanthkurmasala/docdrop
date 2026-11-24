import { PDFDocument, StandardFonts, rgb, degrees, PDFPage, PDFFont, PDFImage } from "pdf-lib";

export type WatermarkType = "text" | "image";

export type WatermarkLayout = "single_center" | "tiled_repeat" | "custom_position";

export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type WatermarkPageScope = "all" | "first" | "exclude_first" | "even" | "odd" | "custom";

export type WatermarkColor = "gray" | "red" | "blue" | "green" | "amber" | "black";

export type WatermarkFont = "helvetica" | "times" | "courier";

export interface WatermarkPreset {
  id: string;
  name: string;
  text: string;
  color: WatermarkColor;
  rotation: number;
  layout: WatermarkLayout;
  opacity: number;
}

export const WATERMARK_PRESETS: WatermarkPreset[] = [
  {
    id: "confidential",
    name: "Confidential",
    text: "CONFIDENTIAL",
    color: "gray",
    rotation: 45,
    layout: "single_center",
    opacity: 0.22,
  },
  {
    id: "do_not_copy",
    name: "Do Not Copy",
    text: "DO NOT COPY",
    color: "red",
    rotation: 45,
    layout: "single_center",
    opacity: 0.25,
  },
  {
    id: "draft",
    name: "Draft",
    text: "DRAFT",
    color: "gray",
    rotation: 45,
    layout: "single_center",
    opacity: 0.2,
  },
  {
    id: "sample",
    name: "Sample Document",
    text: "SAMPLE",
    color: "blue",
    rotation: 45,
    layout: "single_center",
    opacity: 0.22,
  },
  {
    id: "nda_tiled",
    name: "NDA Security (Tiled)",
    text: "RESTRICTED • NDA ONLY",
    color: "amber",
    rotation: 30,
    layout: "tiled_repeat",
    opacity: 0.16,
  },
  {
    id: "top_secret",
    name: "Top Secret",
    text: "TOP SECRET",
    color: "red",
    rotation: 45,
    layout: "single_center",
    opacity: 0.28,
  },
];

export interface WatermarkOptions {
  type?: WatermarkType;
  text?: string;
  imageFile?: File | Blob | ArrayBuffer | Uint8Array;
  imageFormat?: "png" | "jpg" | "jpeg" | "webp";
  layout?: WatermarkLayout;
  position?: WatermarkPosition;
  rotation?: number; // degrees, e.g. 45, 0, -45, 90
  opacity?: number; // 0.05 to 1.0 (default 0.25)
  fontSizeScale?: "small" | "medium" | "large" | "auto";
  color?: WatermarkColor;
  fontFamily?: WatermarkFont;
  pageScope?: WatermarkPageScope;
  customPages?: string | number[]; // e.g. "1-3, 5"
  onProgress?: (progress: number, status: string) => void;
}

export interface WatermarkResult {
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
  pagesWatermarked: number[];
  summary: string;
}

/**
 * Maps color names to rgb tuples
 */
function getWatermarkRgb(color: WatermarkColor = "gray") {
  switch (color) {
    case "red":
      return rgb(0.85, 0.15, 0.15);
    case "blue":
      return rgb(0.12, 0.35, 0.85);
    case "green":
      return rgb(0.1, 0.6, 0.25);
    case "amber":
      return rgb(0.8, 0.5, 0.05);
    case "black":
      return rgb(0.1, 0.1, 0.1);
    case "gray":
    default:
      return rgb(0.48, 0.5, 0.52);
  }
}

/**
 * Resolves standard embedded font
 */
async function resolveFont(pdfDoc: PDFDocument, fontFamily: WatermarkFont = "helvetica"): Promise<PDFFont> {
  switch (fontFamily) {
    case "times":
      return await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    case "courier":
      return await pdfDoc.embedFont(StandardFonts.CourierBold);
    case "helvetica":
    default:
      return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
}

/**
 * Parses target pages for watermarking based on scope
 */
export function parseWatermarkPages(scope: WatermarkPageScope = "all", customPages?: string | number[], totalPages = 1): number[] {
  if (totalPages <= 0) return [];

  if (scope === "first") return [1];
  if (scope === "exclude_first") {
    const list: number[] = [];
    for (let i = 2; i <= totalPages; i++) list.push(i);
    return list.length > 0 ? list : [1];
  }
  if (scope === "even") {
    const list: number[] = [];
    for (let i = 2; i <= totalPages; i += 2) list.push(i);
    return list.length > 0 ? list : [1];
  }
  if (scope === "odd") {
    const list: number[] = [];
    for (let i = 1; i <= totalPages; i += 2) list.push(i);
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
 * Calculates anchor position for nine-grid layout
 */
function getGridPosition(
  pos: WatermarkPosition = "center",
  pageWidth: number,
  pageHeight: number,
  elementWidth: number,
  elementHeight: number,
  margin = 40
): { x: number; y: number } {
  let x = (pageWidth - elementWidth) / 2;
  let y = (pageHeight - elementHeight) / 2;

  switch (pos) {
    case "top-left":
      x = margin;
      y = pageHeight - elementHeight - margin;
      break;
    case "top-center":
      x = (pageWidth - elementWidth) / 2;
      y = pageHeight - elementHeight - margin;
      break;
    case "top-right":
      x = pageWidth - elementWidth - margin;
      y = pageHeight - elementHeight - margin;
      break;
    case "middle-left":
      x = margin;
      y = (pageHeight - elementHeight) / 2;
      break;
    case "center":
      x = (pageWidth - elementWidth) / 2;
      y = (pageHeight - elementHeight) / 2;
      break;
    case "middle-right":
      x = pageWidth - elementWidth - margin;
      y = (pageHeight - elementHeight) / 2;
      break;
    case "bottom-left":
      x = margin;
      y = margin;
      break;
    case "bottom-center":
      x = (pageWidth - elementWidth) / 2;
      y = margin;
      break;
    case "bottom-right":
      x = pageWidth - elementWidth - margin;
      y = margin;
      break;
  }
  return { x, y };
}

/**
 * Stamp custom text or image watermark onto PDF pages with full layout, rotation, and opacity control.
 * 100% client-side in-browser memory execution.
 */
export async function watermarkPdf(
  file: File,
  optionsOrText: string | WatermarkOptions = "CONFIDENTIAL",
  legacyOpacity: number = 0.25
): Promise<WatermarkResult> {
  const options: WatermarkOptions =
    typeof optionsOrText === "string"
      ? { text: optionsOrText, opacity: legacyOpacity }
      : optionsOrText;

  const watermarkType = options.type || (options.imageFile ? "image" : "text");
  const rawText = (options.text || "CONFIDENTIAL").trim();

  if (watermarkType === "text" && !rawText) {
    throw new Error("Watermark text cannot be empty.");
  }

  options.onProgress?.(10, "Loading PDF in local memory...");

  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();

  if (total === 0) {
    throw new Error("Cannot watermark a PDF document with 0 pages.");
  }

  options.onProgress?.(25, "Preparing watermark assets...");

  const font = await resolveFont(pdfDoc, options.fontFamily);
  const color = getWatermarkRgb(options.color);
  const opacity = Math.max(0.05, Math.min(options.opacity !== undefined ? options.opacity : 0.25, 0.95));
  const rotation = options.rotation !== undefined ? options.rotation : 45;
  const layout = options.layout || "single_center";
  const position = options.position || "center";

  // If image watermark, embed image
  let embeddedImage: PDFImage | null = null;
  if (watermarkType === "image" && options.imageFile) {
    try {
      let imgBytes: Uint8Array;
      if (options.imageFile instanceof File || options.imageFile instanceof Blob) {
        imgBytes = new Uint8Array(await options.imageFile.arrayBuffer());
      } else if (options.imageFile instanceof ArrayBuffer) {
        imgBytes = new Uint8Array(options.imageFile);
      } else {
        imgBytes = options.imageFile;
      }

      // Check format
      const isPng =
        options.imageFormat === "png" ||
        (imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4e && imgBytes[3] === 0x47);

      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      }
    } catch (e: any) {
      console.warn("Could not embed image watermark, falling back to text:", e);
    }
  }

  const targetPages = parseWatermarkPages(options.pageScope, options.customPages, total);

  options.onProgress?.(50, `Stamping watermark across ${targetPages.length} pages...`);

  for (let idx = 0; idx < targetPages.length; idx++) {
    const pageNum = targetPages[idx];
    const page = pdfDoc.getPage(pageNum - 1);
    const { width, height } = page.getSize();

    if (embeddedImage) {
      // Image Watermark rendering
      const imgDims = embeddedImage.scale(1.0);
      let imgScale = Math.min((width * 0.4) / imgDims.width, (height * 0.4) / imgDims.height, 1.0);

      if (options.fontSizeScale === "small") imgScale *= 0.5;
      else if (options.fontSizeScale === "large") imgScale *= 1.4;

      const imgW = imgDims.width * imgScale;
      const imgH = imgDims.height * imgScale;

      if (layout === "tiled_repeat") {
        const cols = 3;
        const rows = 3;
        const stepX = width / cols;
        const stepY = height / rows;

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const tileX = c * stepX + (stepX - imgW * 0.6) / 2;
            const tileY = r * stepY + (stepY - imgH * 0.6) / 2;
            page.drawImage(embeddedImage, {
              x: tileX,
              y: tileY,
              width: imgW * 0.6,
              height: imgH * 0.6,
              opacity: Math.min(opacity * 0.8, 0.5),
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        const { x, y } = getGridPosition(position, width, height, imgW, imgH);
        page.drawImage(embeddedImage, {
          x,
          y,
          width: imgW,
          height: imgH,
          opacity,
          rotate: degrees(rotation),
        });
      }
    } else {
      // Text Watermark rendering
      let fontSize = Math.min(width, height) / 8;
      if (options.fontSizeScale === "small") fontSize = Math.min(width, height) / 14;
      else if (options.fontSizeScale === "large") fontSize = Math.min(width, height) / 5.5;

      const textWidth = font.widthOfTextAtSize(rawText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      if (layout === "tiled_repeat") {
        const cols = 3;
        const rows = 4;
        const stepX = width / cols;
        const stepY = height / rows;
        const tiledFontSize = fontSize * 0.45;
        const tiledTextWidth = font.widthOfTextAtSize(rawText, tiledFontSize);
        const tiledTextHeight = font.heightAtSize(tiledFontSize);

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const tileX = c * stepX + (stepX - tiledTextWidth) / 2;
            const tileY = r * stepY + (stepY - tiledTextHeight) / 2;
            page.drawText(rawText, {
              x: tileX,
              y: tileY,
              size: tiledFontSize,
              font,
              color,
              opacity: Math.min(opacity * 0.75, 0.4),
              rotate: degrees(rotation),
            });
          }
        }
      } else if (layout === "custom_position") {
        const { x, y } = getGridPosition(position, width, height, textWidth, textHeight);
        page.drawText(rawText, {
          x,
          y,
          size: fontSize,
          font,
          color,
          opacity,
          rotate: degrees(rotation),
        });
      } else {
        // Default: single centered diagonal
        // Exact center placement accounting for rotation
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Approximate rotated bounding box offset
        const offsetX = (textWidth * cos - textHeight * sin) / 2;
        const offsetY = (textWidth * sin + textHeight * cos) / 2;

        const centerX = width / 2 - offsetX;
        const centerY = height / 2 - offsetY;

        page.drawText(rawText, {
          x: centerX,
          y: centerY,
          size: fontSize,
          font,
          color,
          opacity,
          rotate: degrees(rotation),
        });
      }
    }
  }

  options.onProgress?.(85, "Finalizing watermarked PDF...");

  pdfDoc.setProducer("DocDrop Precision Watermark Engine • 100% In-Browser Memory");
  pdfDoc.setCreator("DocDrop Document Studio v2.4");

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  options.onProgress?.(100, "Watermarking complete!");

  return {
    pdfBytes,
    fileName: `${baseName}_watermarked.pdf`,
    totalPages: total,
    pagesWatermarked: targetPages,
    summary: `Stamped watermark across ${targetPages.length} of ${total} pages.`,
  };
}
