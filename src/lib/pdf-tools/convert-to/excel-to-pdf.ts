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
    .replace(/[^\x00-\x7F]/g, (char) => {
      return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || " ";
    });
}

export interface ExcelToPdfOptions {
  orientation?: "landscape" | "portrait";
  theme?: "corporate_blue" | "minimalist" | "financial_green";
  showGridlines?: boolean;
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Convert Excel (.xlsx / .csv) spreadsheets to formatted PDF tables
 * Supports all sheets in workbook, dynamic column fitting, and professional table borders
 */
export async function convertExcelToPdf(
  file: File,
  options?: ExcelToPdfOptions
): Promise<{
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
}> {
  options?.onProgress?.(15, "Loading spreadsheet workbook...");
  const XLSX = await import("xlsx");
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheetNames = wb.SheetNames;

  options?.onProgress?.(35, "Analyzing sheets, columns & table boundaries...");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const isPortrait = options?.orientation === "portrait";
  const pageSize: [number, number] = isPortrait ? [595, 842] : [842, 595];
  const margin = 36;
  const printableWidth = pageSize[0] - margin * 2;
  const maxY = pageSize[1] - margin;
  const minY = margin;
  const rowHeight = 20;

  const theme = options?.theme || "corporate_blue";
  let headerBg = rgb(0.92, 0.94, 0.98);
  let headerColor = rgb(0.1, 0.15, 0.35);
  let zebraBg = rgb(0.98, 0.98, 0.99);
  let borderColor = rgb(0.85, 0.88, 0.94);

  if (theme === "minimalist") {
    headerBg = rgb(0.95, 0.95, 0.95);
    headerColor = rgb(0.12, 0.12, 0.12);
    zebraBg = rgb(0.99, 0.99, 0.99);
    borderColor = rgb(0.9, 0.9, 0.9);
  } else if (theme === "financial_green") {
    headerBg = rgb(0.91, 0.96, 0.92);
    headerColor = rgb(0.08, 0.32, 0.14);
    zebraBg = rgb(0.98, 0.99, 0.98);
    borderColor = rgb(0.82, 0.9, 0.84);
  }

  const showGridlines = options?.showGridlines !== false;

  for (const sheetName of sheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!data || data.length === 0) continue;

    // Filter out completely empty trailing rows
    const activeRows = data.filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")
    );
    if (activeRows.length === 0) continue;

    // Determine actual column count across rows
    const colCount = Math.max(...activeRows.map((r) => r.length), 1);
    const colWidth = Math.max(60, printableWidth / colCount);

    let currentPage = pdfDoc.addPage(pageSize);
    let currentY = maxY;

    // Sheet Header Banner
    currentPage.drawText(`Sheet: ${sanitizeWinAnsi(sheetName)}`, {
      x: margin,
      y: currentY,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.35),
    });

    currentPage.drawText(`Total Rows: ${activeRows.length} | Columns: ${colCount}`, {
      x: margin + 300,
      y: currentY + 1,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    currentY -= 26;

    activeRows.forEach((row, rowIdx) => {
      if (currentY - rowHeight < minY) {
        currentPage = pdfDoc.addPage(pageSize);
        currentY = maxY;

        // Re-draw small continuation header
        currentPage.drawText(`Sheet: ${sanitizeWinAnsi(sheetName)} (Continued)`, {
          x: margin,
          y: currentY,
          size: 9,
          font: fontBold,
          color: rgb(0.4, 0.4, 0.4),
        });
        currentY -= 20;
      }

      const isHeader = rowIdx === 0;

      // Draw row background for header or alternate zebra banding
      if (isHeader) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - 4,
          width: printableWidth,
          height: rowHeight,
          color: headerBg,
        });
      } else if (rowIdx % 2 === 0) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - 4,
          width: printableWidth,
          height: rowHeight,
          color: zebraBg,
        });
      }

      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const rawCell = row[cIdx];
        const cellText = sanitizeWinAnsi(String(rawCell ?? ""));
        const cellX = margin + cIdx * colWidth;

        // Dynamic char truncation based on computed column width
        const maxChars = Math.max(10, Math.floor(colWidth / 5.5));
        const displayText = cellText.length > maxChars ? cellText.slice(0, maxChars - 2) + ".." : cellText;

        currentPage.drawText(displayText, {
          x: cellX + 4,
          y: currentY,
          size: isHeader ? 8.5 : 8,
          font: isHeader ? fontBold : font,
          color: isHeader ? headerColor : rgb(0.2, 0.2, 0.2),
        });

        if (showGridlines) {
          currentPage.drawLine({
            start: { x: cellX, y: currentY - 4 },
            end: { x: cellX, y: currentY - 4 + rowHeight },
            thickness: 0.5,
            color: borderColor,
          });
        }
      }

      if (showGridlines) {
        currentPage.drawLine({
          start: { x: margin, y: currentY - 4 },
          end: { x: margin + printableWidth, y: currentY - 4 },
          thickness: 0.5,
          color: borderColor,
        });
      }

      // Draw bottom row divider line
      currentPage.drawLine({
        start: { x: margin, y: currentY - 4 },
        end: { x: margin + printableWidth, y: currentY - 4 },
        thickness: isHeader ? 1.0 : 0.5,
        color: isHeader ? rgb(0.7, 0.75, 0.85) : rgb(0.88, 0.88, 0.9),
      });

      currentY -= rowHeight;
    });
  }

  // Ensure at least 1 page exists if workbook was empty
  if (pdfDoc.getPageCount() === 0) {
    const emptyPage = pdfDoc.addPage(pageSize);
    emptyPage.drawText("Workbook contains no data.", {
      x: margin,
      y: maxY,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes,
    fileName: `${baseName}_workbook.pdf`,
    totalPages: pdfDoc.getPageCount(),
  };
}
