import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export type LiveFontFamily = "Helvetica" | "TimesRoman" | "Courier";

export interface LiveTextSpanEdit {
  id: string;
  pageIndex: number; // 0-based
  originalStr: string;
  newStr: string;
  x: number; // PDF points (left)
  y: number; // PDF points (baseline)
  width: number; // PDF points
  height: number; // PDF points
  fontSize: number; // PDF points
  fontFamily: LiveFontFamily;
  isBold: boolean;
  isItalic: boolean;
  color: string; // hex, e.g. "#000000"
  backgroundColor?: string; // hex, default "#FFFFFF"
}

export interface LiveAddedText {
  id: string;
  pageIndex: number; // 0-based
  text: string;
  x: number; // PDF points
  y: number; // PDF points (baseline)
  fontSize: number;
  fontFamily: LiveFontFamily;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  opacity?: number;
}

export interface LiveWhiteout {
  id: string;
  pageIndex: number; // 0-based
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // hex, default "#FFFFFF"
}

export interface LiveHighlight {
  id: string;
  pageIndex: number; // 0-based
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // hex, default "#FEF08A"
  opacity?: number; // 0.1 to 1.0 (default 0.45)
}

export interface LiveStampPlacement {
  id: string;
  pageIndex: number;
  text: string;
  subtitle?: string;
  x: number;
  y: number;
  tone: "approved" | "rejected" | "confidential" | "warning";
  rotation: number;
}

export interface LivePdfEdits {
  textEdits: LiveTextSpanEdit[];
  addedTexts: LiveAddedText[];
  whiteouts: LiveWhiteout[];
  highlights: LiveHighlight[];
  stamps?: LiveStampPlacement[];
}

export interface LivePdfEditorResult {
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
  totalEditsCount: number;
  summary: string;
}

function hexToRgb(hex: string) {
  try {
    const clean = hex.replace("#", "").trim();
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    const num = parseInt(full, 16);
    if (isNaN(num)) return rgb(0, 0, 0);
    return rgb(
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    );
  } catch {
    return rgb(0, 0, 0);
  }
}

async function getStandardFont(
  pdfDoc: PDFDocument,
  family: LiveFontFamily,
  isBold: boolean,
  isItalic: boolean
) {
  if (family === "TimesRoman") {
    if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    if (isBold) return await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    if (isItalic) return await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    return await pdfDoc.embedFont(StandardFonts.TimesRoman);
  }
  if (family === "Courier") {
    if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
    if (isBold) return await pdfDoc.embedFont(StandardFonts.CourierBold);
    if (isItalic) return await pdfDoc.embedFont(StandardFonts.CourierOblique);
    return await pdfDoc.embedFont(StandardFonts.Courier);
  }
  // Default to Helvetica
  if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  if (isBold) return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  if (isItalic) return await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  return await pdfDoc.embedFont(StandardFonts.Helvetica);
}

/**
 * Applies all live visual edits (in-place text replacement, added text, whiteouts, highlights, and stamps)
 * completely in client memory with zero server transfer.
 */
export async function applyLivePdfEdits(
  file: File,
  edits: LivePdfEdits,
  options?: {
    onProgress?: (progress: number, message: string) => void;
  }
): Promise<LivePdfEditorResult> {
  options?.onProgress?.(10, "Initializing Canva Live PDF Engine in memory...");
  const buffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  options?.onProgress?.(30, "Preparing precision typography & font maps...");

  let totalEditsCount = 0;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pages[pageIdx];
    const pageEdits = edits.textEdits.filter((e) => e.pageIndex === pageIdx);
    const pageAdded = edits.addedTexts.filter((e) => e.pageIndex === pageIdx);
    const pageWhiteouts = edits.whiteouts.filter((e) => e.pageIndex === pageIdx);
    const pageHighlights = edits.highlights.filter((e) => e.pageIndex === pageIdx);
    const pageStamps = (edits.stamps || []).filter((e) => e.pageIndex === pageIdx);

    const progressPct = 30 + Math.round(((pageIdx + 1) / totalPages) * 50);
    options?.onProgress?.(progressPct, `Processing page ${pageIdx + 1} of ${totalPages}...`);

    // 1. Apply Whiteouts (Opaque masks)
    for (const w of pageWhiteouts) {
      page.drawRectangle({
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        color: hexToRgb(w.color || "#FFFFFF"),
        borderWidth: 0,
      });
      totalEditsCount++;
    }

    // 2. Apply In-Place Text Replacements
    for (const edit of pageEdits) {
      // Step A: Mask original text location cleanly
      const maskY = edit.y - edit.fontSize * 0.28;
      const maskHeight = edit.height > 0 ? edit.height * 1.15 : edit.fontSize * 1.25;
      const maskWidth = Math.max(edit.width + 4, edit.fontSize * 0.5);

      page.drawRectangle({
        x: Math.max(0, edit.x - 1.5),
        y: Math.max(0, maskY),
        width: maskWidth,
        height: maskHeight,
        color: hexToRgb(edit.backgroundColor || "#FFFFFF"),
        borderWidth: 0,
      });

      // Step B: Render new replacement text in place
      if (edit.newStr && edit.newStr.trim().length > 0) {
        const font = await getStandardFont(
          pdfDoc,
          edit.fontFamily,
          edit.isBold,
          edit.isItalic
        );

        // Sanitize string for standard 14 fonts
        const cleanStr = edit.newStr.replace(/[^\x00-\x7F]/g, " ");

        page.drawText(cleanStr, {
          x: edit.x,
          y: edit.y,
          size: edit.fontSize,
          font,
          color: hexToRgb(edit.color || "#000000"),
        });
      }
      totalEditsCount++;
    }

    // 3. Apply Highlights (Translucent tint rectangles)
    for (const h of pageHighlights) {
      page.drawRectangle({
        x: h.x,
        y: h.y,
        width: h.width,
        height: h.height,
        color: hexToRgb(h.color || "#FEF08A"),
        opacity: h.opacity ?? 0.45,
        borderWidth: 0,
      });
      totalEditsCount++;
    }

    // 4. Apply Added Text Boxes
    for (const t of pageAdded) {
      if (t.text && t.text.trim().length > 0) {
        const font = await getStandardFont(
          pdfDoc,
          t.fontFamily,
          t.isBold,
          t.isItalic
        );
        const cleanStr = t.text.replace(/[^\x00-\x7F]/g, " ");

        page.drawText(cleanStr, {
          x: t.x,
          y: t.y,
          size: t.fontSize,
          font,
          color: hexToRgb(t.color || "#000000"),
          opacity: t.opacity ?? 1,
        });
        totalEditsCount++;
      }
    }

    // 5. Apply Stamps if any
    for (const s of pageStamps) {
      const stampFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const isRed = s.tone === "rejected" || s.tone === "confidential";
      const borderColor = isRed ? rgb(0.85, 0.15, 0.2) : rgb(0.1, 0.6, 0.3);
      const textColor = borderColor;

      // Draw double-border badge
      page.drawRectangle({
        x: s.x,
        y: s.y,
        width: 170,
        height: 48,
        borderColor,
        borderWidth: 2,
        color: rgb(1, 1, 1),
        rotate: degrees(s.rotation || 0),
      });

      page.drawText(s.text, {
        x: s.x + 10,
        y: s.y + (s.subtitle ? 24 : 16),
        size: 11,
        font: stampFont,
        color: textColor,
        rotate: degrees(s.rotation || 0),
      });

      if (s.subtitle) {
        const subFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(s.subtitle, {
          x: s.x + 10,
          y: s.y + 8,
          size: 7.5,
          font: subFont,
          color: textColor,
          rotate: degrees(s.rotation || 0),
        });
      }
      totalEditsCount++;
    }
  }

  options?.onProgress?.(88, "Finalizing live PDF document byte-stream...");

  pdfDoc.setProducer("DocDrop Canva Live Studio • 100% In-Browser Memory");
  pdfDoc.setCreator("DocDrop Studio v3.0");

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  options?.onProgress?.(100, "Live edits compiled successfully!");

  return {
    pdfBytes,
    fileName: `${baseName}_edited.pdf`,
    totalPages,
    totalEditsCount,
    summary: `Applied ${totalEditsCount} Canva live edit(s) across ${totalPages} page(s).`,
  };
}
