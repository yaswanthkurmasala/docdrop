import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Sanitizes Unicode characters to safe WinAnsi equivalents to prevent pdf-lib encoding crashes
 */
function sanitizeWinAnsi(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/[\u2022\u25CF\u25AA]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/€/g, "EUR")
    .replace(/£/g, "GBP")
    .replace(/¥/g, "JPY")
    .replace(/₹/g, "INR")
    .replace(/[^\x00-\x7F]/g, (char) => {
      return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || " ";
    });
}

function wrapWords(text: string, maxLen: number = 80): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let curr = "";
  for (const w of words) {
    if (!curr) {
      curr = w;
    } else if (curr.length + w.length + 1 <= maxLen) {
      curr += " " + w;
    } else {
      lines.push(curr);
      curr = w;
    }
  }
  if (curr) lines.push(curr);
  return lines;
}

/**
 * Convert Microsoft Word (.docx) document to PDF with headings, lists, and table preservation
 */
export async function convertWordToPdf(file: File): Promise<{
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
}> {
  const mammothModule = await import("mammoth");
  const mammoth = (mammothModule as any).default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = typeof Buffer !== "undefined" ? Buffer.from(arrayBuffer) : arrayBuffer;

  let html = "";
  try {
    const res = await (mammoth.convertToHtml as any)({
      buffer,
      arrayBuffer,
    });
    html = res.value || "";
  } catch {
    // Fallback if HTML conversion has an error
    const rawRes = await (mammoth.extractRawText as any)({ buffer, arrayBuffer });
    html = `<p>${rawRes.value.replace(/\n\n+/g, "</p><p>")}</p>`;
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageSize: [number, number] = [595, 842]; // A4
  const margin = 48;
  const printableWidth = pageSize[0] - margin * 2;
  const maxY = pageSize[1] - margin;
  const minY = margin;

  let currentPage = pdfDoc.addPage(pageSize);
  let currentY = maxY;

  const ensureSpace = (neededHeight: number) => {
    if (currentY - neededHeight < minY) {
      currentPage = pdfDoc.addPage(pageSize);
      currentY = maxY;
    }
  };

  // Header Title
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  currentPage.drawText(sanitizeWinAnsi(baseName), {
    x: margin,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.5, 0.5, 0.5),
  });
  currentY -= 28;

  // Simple token parser for mammoth HTML output:
  // Extracts <h1-h4>, <p>, <ul>/<ol>/<li>, and <table>
  const blockRegex = /<(h[1-4]|p|ul|ol|table)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let hasDrawnContent = false;

  while ((match = blockRegex.exec(html)) !== null) {
    hasDrawnContent = true;
    const tag = match[1].toLowerCase();
    const content = match[2];

    if (tag.startsWith("h")) {
      const level = parseInt(tag.charAt(1), 10);
      const fontSize = level === 1 ? 16 : level === 2 ? 14 : 12;
      const cleanText = sanitizeWinAnsi(content.replace(/<[^>]+>/g, "").trim());
      if (!cleanText) continue;

      ensureSpace(fontSize + 16);
      currentY -= 8;

      currentPage.drawText(cleanText.slice(0, 70), {
        x: margin,
        y: currentY,
        size: fontSize,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= fontSize + 10;
    } else if (tag === "p") {
      const cleanText = sanitizeWinAnsi(content.replace(/<[^>]+>/g, "").trim());
      if (!cleanText) {
        currentY -= 6;
        continue;
      }

      const wrapped = wrapWords(cleanText, 78);
      ensureSpace(wrapped.length * 15 + 8);

      for (const line of wrapped) {
        ensureSpace(16);
        currentPage.drawText(line, {
          x: margin,
          y: currentY,
          size: 10,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 14;
      }
      currentY -= 6;
    } else if (tag === "ul" || tag === "ol") {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      let idx = 1;

      while ((liMatch = liRegex.exec(content)) !== null) {
        const itemText = sanitizeWinAnsi(liMatch[1].replace(/<[^>]+>/g, "").trim());
        if (!itemText) continue;

        const bullet = tag === "ol" ? `${idx++}. ` : "- ";
        const wrapped = wrapWords(itemText, 72);
        ensureSpace(wrapped.length * 15);

        for (let lIdx = 0; lIdx < wrapped.length; lIdx++) {
          ensureSpace(16);
          const prefix = lIdx === 0 ? bullet : "   ";
          currentPage.drawText(prefix + wrapped[lIdx], {
            x: margin + 8,
            y: currentY,
            size: 10,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          currentY -= 14;
        }
      }
      currentY -= 6;
    } else if (tag === "table") {
      // Parse table rows and cells
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows: string[][] = [];
      let trMatch;

      while ((trMatch = rowRegex.exec(content)) !== null) {
        const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        const cells: string[] = [];
        let tdMatch;
        while ((tdMatch = cellRegex.exec(trMatch[1])) !== null) {
          cells.push(sanitizeWinAnsi(tdMatch[1].replace(/<[^>]+>/g, "").trim()));
        }
        if (cells.length > 0) rows.push(cells);
      }

      if (rows.length === 0) continue;

      const colCount = Math.max(...rows.map((r) => r.length));
      const colWidth = Math.min(150, printableWidth / Math.max(colCount, 1));
      const rowHeight = 22;

      ensureSpace(rows.length * rowHeight + 20);

      rows.forEach((row, rIdx) => {
        ensureSpace(rowHeight + 4);
        const isHeader = rIdx === 0;

        // Background highlight for header row
        if (isHeader) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - 4,
            width: colWidth * colCount,
            height: rowHeight,
            color: rgb(0.94, 0.95, 0.98),
          });
        }

        row.forEach((cellText, cIdx) => {
          const cellX = margin + cIdx * colWidth;
          currentPage.drawText(cellText.slice(0, 22), {
            x: cellX + 4,
            y: currentY,
            size: isHeader ? 9 : 8.5,
            font: isHeader ? fontBold : font,
            color: isHeader ? rgb(0.1, 0.15, 0.4) : rgb(0.2, 0.2, 0.2),
          });
        });

        // Bottom border line per row
        currentPage.drawLine({
          start: { x: margin, y: currentY - 4 },
          end: { x: margin + colWidth * colCount, y: currentY - 4 },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });

        currentY -= rowHeight;
      });
      currentY -= 12;
    }
  }

  // Fallback if no block tags matched
  if (!hasDrawnContent) {
    const cleanRaw = sanitizeWinAnsi(html.replace(/<[^>]+>/g, "\n").trim());
    const wrapped = wrapWords(cleanRaw, 78);
    for (const line of wrapped) {
      ensureSpace(16);
      currentPage.drawText(line, {
        x: margin,
        y: currentY,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 14;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    fileName: `${baseName}.pdf`,
    totalPages: pdfDoc.getPageCount(),
  };
}
