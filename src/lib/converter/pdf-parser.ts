import { cleanMarkdown } from "./cleaner.ts";

export interface PdfParseResult {
  markdown: string;
  pageCount: number;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Parses a PDF ArrayBuffer directly in the browser into clean Markdown with table detection.
 */
export async function parsePdf(arrayBuffer: ArrayBuffer): Promise<PdfParseResult> {
  // Dynamically import pdfjs-dist legacy build for broad browser & node compatibility
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Ensure local worker is set up
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const items: TextItem[] = [];

    for (const item of textContent.items) {
      if ("str" in item && typeof item.str === "string" && item.str.trim().length > 0) {
        // In PDF coordinates: transform[4] is X, transform[5] is Y
        const tx = item.transform[4];
        const ty = item.transform[5];
        items.push({
          str: item.str,
          x: tx,
          y: ty,
          width: item.width || 0,
          height: item.height || 0,
        });
      }
    }

    if (items.length === 0) continue;

    // Filter out top 4% and bottom 4% of page as headers/footers (page numbers, repeating titles)
    const pageHeight = viewport.height;
    const bodyItems = items.filter((item) => {
      const isTopMargin = item.y > pageHeight * 0.96;
      const isBottomMargin = item.y < pageHeight * 0.04;
      return !isTopMargin && !isBottomMargin;
    });

    // Group items into lines: sort by Y descending (top to bottom), then by X ascending (left to right)
    bodyItems.sort((a, b) => {
      // If Y coordinates are within 4px of each other, consider them on the same line
      if (Math.abs(b.y - a.y) > 4) {
        return b.y - a.y; // Higher Y first (top of page)
      }
      return a.x - b.x; // Left to right
    });

    // Bucket into distinct lines
    const rawLines: TextItem[][] = [];
    let currentLine: TextItem[] = [];
    let currentY: number | null = null;

    for (const item of bodyItems) {
      if (currentY === null || Math.abs(currentY - item.y) <= 4) {
        currentLine.push(item);
        currentY = item.y;
      } else {
        if (currentLine.length > 0) {
          rawLines.push(currentLine);
        }
        currentLine = [item];
        currentY = item.y;
      }
    }
    if (currentLine.length > 0) {
      rawLines.push(currentLine);
    }

    interface ColumnCell {
      x: number;
      maxX: number;
      text: string;
    }

    interface ProcessedLine {
      y: number;
      maxHeight: number;
      cells: ColumnCell[];
      fullText: string;
      isHeading: boolean;
      headingLevel?: number;
      isList: boolean;
    }

    const processedLines: ProcessedLine[] = [];

    for (const line of rawLines) {
      line.sort((a, b) => a.x - b.x);
      const maxHeight = Math.max(...line.map((i) => i.height));

      // Group text items in the line into cells based on horizontal gaps
      const cells: ColumnCell[] = [];
      let currentCell: { x: number; maxX: number; parts: string[] } | null = null;

      for (let i = 0; i < line.length; i++) {
        const item = line[i];
        const str = item.str.trim();
        if (!str) continue;

        const itemX = item.x;
        const itemWidth = item.width || str.length * 6;
        const itemMaxX = itemX + itemWidth;

        if (!currentCell) {
          currentCell = { x: itemX, maxX: itemMaxX, parts: [str] };
        } else {
          const gap = itemX - currentCell.maxX;
          // If gap between text tokens is larger than 18px, treat as separate column cell
          if (gap > 18) {
            cells.push({
              x: currentCell.x,
              maxX: currentCell.maxX,
              text: currentCell.parts.join(" "),
            });
            currentCell = { x: itemX, maxX: itemMaxX, parts: [str] };
          } else {
            currentCell.parts.push(str);
            currentCell.maxX = Math.max(currentCell.maxX, itemMaxX);
          }
        }
      }

      if (currentCell && currentCell.parts.length > 0) {
        cells.push({
          x: currentCell.x,
          maxX: currentCell.maxX,
          text: currentCell.parts.join(" "),
        });
      }

      const fullText = cells.map((c) => c.text).join(" ").trim();
      if (!fullText) continue;

      const isHeading2 = maxHeight >= 18 && fullText.length < 80;
      const isHeading3 = maxHeight >= 14 && fullText.length < 90;
      const isList = /^[-*•]\s+|\d+\.\s+/.test(fullText);

      processedLines.push({
        y: line[0]?.y ?? 0,
        maxHeight,
        cells,
        fullText,
        isHeading: isHeading2 || isHeading3,
        headingLevel: isHeading2 ? 2 : isHeading3 ? 3 : undefined,
        isList,
      });
    }

    // Process lines into Markdown with robust Table Reconstruction
    const renderedBlocks: string[] = [];
    let i = 0;

    while (i < processedLines.length) {
      const cur = processedLines[i];

      // Check if this line starts a table (2+ cells, not a heading)
      const canBeTableRow = (pl: ProcessedLine) => pl.cells.length >= 2 && !pl.isHeading;

      if (canBeTableRow(cur)) {
        // Look ahead to check if consecutive lines also have multiple cells (at least 2 rows for a table)
        const tableLines: ProcessedLine[] = [cur];
        let j = i + 1;
        while (j < processedLines.length && canBeTableRow(processedLines[j])) {
          tableLines.push(processedLines[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          // Determine maximum number of columns across the table rows
          const maxCols = Math.max(...tableLines.map((tl) => tl.cells.length));
          
          if (maxCols >= 2) {
            const tableRows: string[][] = [];

            for (const tl of tableLines) {
              const rowCells: string[] = tl.cells.map((c) => c.text.replace(/\|/g, "\\|"));
              while (rowCells.length < maxCols) {
                rowCells.push("");
              }
              tableRows.push(rowCells);
            }

            // Construct Markdown Table
            const headerRow = "| " + tableRows[0].join(" | ") + " |";
            const dividerRow = "| " + new Array(maxCols).fill("---").join(" | ") + " |";
            const bodyRows = tableRows
              .slice(1)
              .map((r) => "| " + r.join(" | ") + " |")
              .join("\n");

            renderedBlocks.push(`\n\n${headerRow}\n${dividerRow}\n${bodyRows}\n\n`);
            i = j;
            continue;
          }
        }
      }

      // Not a table line: render as heading, list, or text paragraph
      if (cur.isHeading) {
        const hashes = cur.headingLevel === 2 ? "##" : "###";
        renderedBlocks.push(`\n\n${hashes} ${cur.fullText}\n`);
      } else if (cur.isList) {
        renderedBlocks.push(cur.fullText.replace(/^[•]\s*/, "- "));
      } else {
        renderedBlocks.push(cur.fullText);
      }

      i++;
    }

    pageTexts.push(renderedBlocks.join("\n"));
  }

  const fullText = pageTexts.join("\n\n---\n\n");
  return {
    markdown: cleanMarkdown(fullText),
    pageCount,
  };
}
