import { PDFDocument, degrees } from "pdf-lib";

export interface PageOrganizeItem {
  pageIndex: number; // 0-based source page index, or -1 for blank page
  rotation?: number; // 0, 90, 180, 270 relative rotation
  isBlank?: boolean; // Flag to indicate a newly inserted blank page
}

export type OrganizeOrderParam =
  | string
  | PageOrganizeItem[]
  | number[];

/**
 * Reorder, rotate, duplicate, or delete PDF pages with deep per-page control.
 * Supports:
 * - Structured PageOrganizeItem[] with custom per-page rotation angles
 * - Numeric arrays of indices
 * - Classical string modes ("reverse", "duplicate", "3, 1, 2") for backwards compatibility
 */
export async function organizePdfPages(
  file: File,
  pageOrderOrMode: OrganizeOrderParam = "reverse"
): Promise<{ pdfBytes: Uint8Array; fileName: string; pageCount: number }> {
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();

  let targetItems: PageOrganizeItem[] = [];

  if (Array.isArray(pageOrderOrMode)) {
    if (pageOrderOrMode.length > 0 && typeof pageOrderOrMode[0] === "number") {
      targetItems = (pageOrderOrMode as number[]).map((idx) => ({
        pageIndex: idx,
        rotation: 0,
      }));
    } else {
      targetItems = pageOrderOrMode as PageOrganizeItem[];
    }
  } else if (typeof pageOrderOrMode === "string") {
    if (pageOrderOrMode === "reverse") {
      for (let i = total - 1; i >= 0; i--) {
        targetItems.push({ pageIndex: i, rotation: 0 });
      }
    } else if (pageOrderOrMode === "duplicate") {
      for (let i = 0; i < total; i++) {
        targetItems.push({ pageIndex: i, rotation: 0 });
        targetItems.push({ pageIndex: i, rotation: 0 });
      }
    } else {
      // Comma-separated list like "3, 1, 2, 4" or "2-4, 1"
      const parts = pageOrderOrMode.split(",").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.includes("-")) {
          const [startStr, endStr] = part.split("-").map((n) => parseInt(n.trim(), 10));
          const s = Math.max(1, Math.min(startStr || 1, total));
          const e = Math.max(s, Math.min(endStr || total, total));
          for (let idx = s; idx <= e; idx++) {
            targetItems.push({ pageIndex: idx - 1, rotation: 0 });
          }
        } else {
          const pNum = parseInt(part, 10);
          if (!isNaN(pNum) && pNum >= 1 && pNum <= total) {
            targetItems.push({ pageIndex: pNum - 1, rotation: 0 });
          }
        }
      }
    }
  }

  if (targetItems.length === 0) {
    targetItems = Array.from({ length: total }, (_, i) => ({ pageIndex: i, rotation: 0 }));
  }

  const newDoc = await PDFDocument.create();
  // Get default page size from the first source page if available, else standard A4 [595.28, 841.89]
  const defaultWidth = total > 0 ? srcDoc.getPage(0).getWidth() : 595.28;
  const defaultHeight = total > 0 ? srcDoc.getPage(0).getHeight() : 841.89;

  for (const item of targetItems) {
    if (item.isBlank || item.pageIndex === -1) {
      const blankPage = newDoc.addPage([defaultWidth, defaultHeight]);
      if (item.rotation) {
        blankPage.setRotation(degrees(item.rotation % 360));
      }
    } else if (item.pageIndex >= 0 && item.pageIndex < total) {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [item.pageIndex]);
      if (item.rotation) {
        const currentAngle = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentAngle + item.rotation) % 360));
      }
      newDoc.addPage(copiedPage);
    }
  }

  const pdfBytes = await newDoc.save({ useObjectStreams: true });
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_organized.pdf`,
    pageCount: newDoc.getPageCount(),
  };
}
