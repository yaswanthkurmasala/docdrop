import { loadPdfJs } from "../common/pdfjs-loader.ts";

interface CoordinateTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extract tabular PDF rows and columns into Excel spreadsheet (.xlsx)
 * Uses coordinate-based spatial clustering to align columns into spreadsheet cells
 */
export async function convertPdfToExcel(file: File): Promise<{
  excelBuffer: ArrayBuffer;
  fileName: string;
  totalRows: number;
}> {
  const pdfjs = await loadPdfJs();
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  const allRows: string[][] = [["Page", "Row #", "Col 1", "Col 2", "Col 3", "Col 4", "Col 5", "Col 6"]];

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: CoordinateTextItem[] = [];

    for (const rawItem of content.items as any[]) {
      if ("str" in rawItem && typeof rawItem.str === "string" && rawItem.str.trim().length > 0) {
        items.push({
          str: rawItem.str.trim(),
          x: rawItem.transform[4],
          y: rawItem.transform[5],
          width: rawItem.width || rawItem.str.length * 6,
          height: rawItem.height || 10,
        });
      }
    }

    if (items.length === 0) continue;

    // Sort top to bottom (Y descending), then left to right (X ascending)
    items.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 4) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    // Bucket into lines
    const lines: CoordinateTextItem[][] = [];
    let currentLine: CoordinateTextItem[] = [];
    let currentY: number | null = null;

    for (const item of items) {
      if (currentY === null || Math.abs(currentY - item.y) <= 4) {
        currentLine.push(item);
        currentY = item.y;
      } else {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [item];
        currentY = item.y;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    // For each line, cluster tokens into column cells based on horizontal distance
    lines.forEach((line, lineIdx) => {
      line.sort((a, b) => a.x - b.x);

      const cells: string[] = [];
      let currentCellParts: string[] = [];
      let currentMaxX = 0;

      for (let i = 0; i < line.length; i++) {
        const item = line[i];
        if (currentCellParts.length === 0) {
          currentCellParts.push(item.str);
          currentMaxX = item.x + item.width;
        } else {
          const gap = item.x - currentMaxX;
          // When gap exceeds 16px, it represents a separate table cell column
          if (gap > 16) {
            cells.push(currentCellParts.join(" "));
            currentCellParts = [item.str];
            currentMaxX = item.x + item.width;
          } else {
            currentCellParts.push(item.str);
            currentMaxX = Math.max(currentMaxX, item.x + item.width);
          }
        }
      }

      if (currentCellParts.length > 0) {
        cells.push(currentCellParts.join(" "));
      }

      if (cells.length > 0) {
        allRows.push([`Page ${p}`, `${lineIdx + 1}`, ...cells]);
      }
    });
  }

  // Normalize column count in header
  const maxColumns = Math.max(...allRows.map((r) => r.length), 3);
  const headerRow = ["Page", "Row #"];
  for (let c = 1; c <= maxColumns - 2; c++) {
    headerRow.push(`Column ${c}`);
  }
  allRows[0] = headerRow;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  return {
    excelBuffer,
    fileName: `${baseName}_extracted.xlsx`,
    totalRows: allRows.length - 1,
  };
}
