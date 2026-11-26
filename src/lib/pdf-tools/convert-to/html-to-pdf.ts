import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function sanitizeWinAnsi(str: string): string {
  if (!str) return "";
  return String(str)
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

export interface HtmlToPdfOptions {
  pageSize?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
  margin?: "standard" | "compact" | "spacious";
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Convert HTML document to formatted PDF with layout preservation
 * Renders headings, blockquotes, lists, tables, and paragraphs cleanly
 */
export async function convertHtmlToPdf(
  file: File,
  options?: HtmlToPdfOptions
): Promise<{
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
}> {
  options?.onProgress?.(15, "Parsing HTML tags and stylesheet classes...");
  const htmlContent = await file.text();

  options?.onProgress?.(40, "Building DOM tree and computing layout flow...");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const baseDims: [number, number] = options?.pageSize === "letter" ? [612, 792] : [595, 842];
  const isLandscape = options?.orientation === "landscape";
  const pageSize: [number, number] = isLandscape ? [Math.max(...baseDims), Math.min(...baseDims)] : [Math.min(...baseDims), Math.max(...baseDims)];

  const margin = options?.margin === "compact" ? 28 : options?.margin === "spacious" ? 64 : 48;
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
  const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const docTitle = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.[^/.]+$/, "");

  currentPage.drawText(sanitizeWinAnsi(docTitle).slice(0, 60), {
    x: margin,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.5, 0.5, 0.5),
  });
  currentY -= 28;

  // Extract body or full HTML
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const contentToParse = bodyMatch ? bodyMatch[1] : htmlContent;

  // Match major structural block tags
  const blockRegex = /<(h[1-6]|p|ul|ol|table|blockquote|pre)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let hasRendered = false;

  while ((match = blockRegex.exec(contentToParse)) !== null) {
    hasRendered = true;
    const tag = match[1].toLowerCase();
    const innerHtml = match[2];

    if (tag.startsWith("h")) {
      const level = parseInt(tag.charAt(1), 10);
      const fontSize = level === 1 ? 16 : level === 2 ? 14 : level === 3 ? 12 : 11;
      const text = sanitizeWinAnsi(innerHtml.replace(/<[^>]+>/g, "").trim());
      if (!text) continue;

      ensureSpace(fontSize + 16);
      currentY -= 10;

      currentPage.drawText(text.slice(0, 65), {
        x: margin,
        y: currentY,
        size: fontSize,
        font: fontBold,
        color: level === 1 ? rgb(0.1, 0.15, 0.4) : rgb(0.15, 0.15, 0.15),
      });
      currentY -= fontSize + 10;
    } else if (tag === "p") {
      const text = sanitizeWinAnsi(innerHtml.replace(/<[^>]+>/g, "").trim());
      if (!text) {
        currentY -= 8;
        continue;
      }

      const wrapped = wrapWords(text, 78);
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
      currentY -= 8;
    } else if (tag === "blockquote") {
      const text = sanitizeWinAnsi(innerHtml.replace(/<[^>]+>/g, "").trim());
      if (!text) continue;

      const wrapped = wrapWords(text, 70);
      ensureSpace(wrapped.length * 15 + 12);

      // Draw left accent bar for blockquote
      currentPage.drawLine({
        start: { x: margin + 4, y: currentY + 4 },
        end: { x: margin + 4, y: currentY - wrapped.length * 14 },
        thickness: 2.5,
        color: rgb(0.3, 0.5, 0.9),
      });

      for (const line of wrapped) {
        ensureSpace(16);
        currentPage.drawText(line, {
          x: margin + 16,
          y: currentY,
          size: 9.5,
          font,
          color: rgb(0.35, 0.35, 0.35),
        });
        currentY -= 14;
      }
      currentY -= 8;
    } else if (tag === "pre") {
      const rawCode = sanitizeWinAnsi(innerHtml.replace(/<[^>]+>/g, "").trim());
      const codeLines = rawCode.split("\n");
      ensureSpace(Math.min(codeLines.length * 13 + 12, 120));

      // Draw light gray background box for code
      currentPage.drawRectangle({
        x: margin,
        y: currentY - codeLines.length * 13,
        width: printableWidth,
        height: codeLines.length * 13 + 8,
        color: rgb(0.96, 0.96, 0.97),
      });

      for (const line of codeLines) {
        ensureSpace(14);
        currentPage.drawText(line.slice(0, 68), {
          x: margin + 8,
          y: currentY - 6,
          size: 8.5,
          font: fontMono,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentY -= 13;
      }
      currentY -= 10;
    } else if (tag === "ul" || tag === "ol") {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      let index = 1;

      while ((liMatch = liRegex.exec(innerHtml)) !== null) {
        const itemText = sanitizeWinAnsi(liMatch[1].replace(/<[^>]+>/g, "").trim());
        if (!itemText) continue;

        const bullet = tag === "ol" ? `${index++}. ` : "- ";
        const wrapped = wrapWords(itemText, 72);
        ensureSpace(wrapped.length * 15);

        for (let idx = 0; idx < wrapped.length; idx++) {
          ensureSpace(16);
          const prefix = idx === 0 ? bullet : "   ";
          currentPage.drawText(prefix + wrapped[idx], {
            x: margin + 8,
            y: currentY,
            size: 9.5,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          currentY -= 14;
        }
      }
      currentY -= 8;
    } else if (tag === "table") {
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows: string[][] = [];
      let trMatch;

      while ((trMatch = rowRegex.exec(innerHtml)) !== null) {
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
      const rowHeight = 20;

      ensureSpace(rows.length * rowHeight + 20);

      rows.forEach((row, rIdx) => {
        ensureSpace(rowHeight + 4);
        const isHeader = rIdx === 0;

        if (isHeader) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - 4,
            width: colWidth * colCount,
            height: rowHeight,
            color: rgb(0.93, 0.95, 0.98),
          });
        }

        row.forEach((cellText, cIdx) => {
          const cellX = margin + cIdx * colWidth;
          currentPage.drawText(cellText.slice(0, 22), {
            x: cellX + 4,
            y: currentY,
            size: isHeader ? 8.5 : 8,
            font: isHeader ? fontBold : font,
            color: isHeader ? rgb(0.1, 0.15, 0.4) : rgb(0.2, 0.2, 0.2),
          });
        });

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

  // Fallback if raw text with minimal tags
  if (!hasRendered) {
    const rawLines = sanitizeWinAnsi(htmlContent.replace(/<[^>]+>/g, "\n"))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of rawLines) {
      const wrapped = wrapWords(line, 78);
      for (const wLine of wrapped) {
        ensureSpace(16);
        currentPage.drawText(wLine, {
          x: margin,
          y: currentY,
          size: 10,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 14;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_rendered.pdf`,
    totalPages: pdfDoc.getPageCount(),
  };
}
