import { loadPdfJs } from "../common/pdfjs-loader.ts";

export type WordLayoutMode = "flowing" | "page_preserved" | "structured_tables";
export type WordStyleTheme = "modern" | "classic" | "minimal";

export interface PdfToWordOptions {
  layoutMode?: WordLayoutMode;
  styleTheme?: WordStyleTheme;
  includePageNumbers?: boolean;
  detectTables?: boolean;
  pageRange?: string; // e.g. "all", "1-3, 5"
  onProgress?: (percent: number, message: string) => void;
}

export interface PdfToWordResult {
  docxBlob: Blob;
  docxBuffer: ArrayBuffer;
  fileName: string;
  totalPages: number;
  totalWords: number;
  totalChars: number;
  headingsCount: number;
  tablesCount: number;
  listsCount: number;
  paragraphsCount: number;
  summary: string;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
}

interface ParsedLine {
  y: number;
  items: RawTextItem[];
  fullText: string;
  maxHeight: number;
  isHeading: boolean;
  headingLevel?: 1 | 2 | 3;
  isList: boolean;
  listMarker?: string;
  isTableCandidate: boolean;
  columns?: string[];
}

/**
 * Parse a page range string (e.g., "1-3, 5") into a set of 1-based page numbers
 */
function parsePageRange(rangeStr: string | undefined, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === "all") {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const selected = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          selected.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        selected.add(num);
      }
    }
  }

  const result = Array.from(selected).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Advanced PDF to Microsoft Word (.docx) Converter
 * Converts PDF text layers into structured, editable Word documents with headings, lists & tables
 */
export async function convertPdfToWord(
  file: File,
  options?: PdfToWordOptions
): Promise<PdfToWordResult> {
  const onProgress = options?.onProgress;
  onProgress?.(5, "Initializing PDF.js engine and Word packer...");

  const pdfjs = await loadPdfJs();
  const docx = await import("docx");
  const {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    PageBreak,
    Header,
    Footer,
    PageNumber,
    Packer,
  } = docx;

  const rawBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(rawBuffer.slice(0)),
    useSystemFonts: true,
  });
  const pdfDoc = await loadingTask.promise;
  const totalPagesInDoc = pdfDoc.numPages;

  const targetPages = parsePageRange(options?.pageRange || "all", totalPagesInDoc);
  const targetPagesSet = new Set(targetPages);

  const layoutMode: WordLayoutMode = options?.layoutMode || "flowing";
  const styleTheme: WordStyleTheme = options?.styleTheme || "modern";
  const includePageNumbers = options?.includePageNumbers !== false;
  const detectTables = options?.detectTables !== false;

  // Theme styling configuration
  const themeFonts = {
    modern: { body: "Calibri", heading: "Calibri Light", primaryColor: "0F172A", accentColor: "2563EB" },
    classic: { body: "Times New Roman", heading: "Georgia", primaryColor: "1E293B", accentColor: "1E3A8A" },
    minimal: { body: "Arial", heading: "Arial Black", primaryColor: "18181B", accentColor: "475569" },
  };
  const activeTheme = themeFonts[styleTheme] || themeFonts.modern;

  const docChildren: any[] = [];
  let totalWords = 0;
  let totalCharCount = 0;
  let totalHeadings = 0;
  let totalTables = 0;
  let totalLists = 0;
  let totalParagraphs = 0;

  // Title Banner
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: baseName.replace(/_/g, " "),
          bold: true,
          size: 40, // 20pt
          font: activeTheme.heading,
          color: activeTheme.primaryColor,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: `Converted from PDF • 100% Client-Side In-Browser Memory by DocDrop`,
          italics: true,
          size: 18, // 9pt
          font: activeTheme.body,
          color: "64748B",
        }),
      ],
    })
  );

  // Iterate through pages
  for (let pIdx = 0; pIdx < targetPages.length; pIdx++) {
    const pageNum = targetPages[pIdx];
    const progressPercent = Math.round(10 + ((pIdx + 1) / targetPages.length) * 75);
    onProgress?.(progressPercent, `Analyzing structure and tables on page ${pageNum} of ${totalPagesInDoc}...`);

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const rawItems: RawTextItem[] = [];
    for (const item of textContent.items as any[]) {
      if (item && typeof item.str === "string" && item.str.trim().length > 0) {
        rawItems.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0,
          fontName: item.fontName || "",
        });
      }
    }

    if (rawItems.length === 0) {
      if (layoutMode === "page_preserved") {
        docChildren.push(
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: `[Page ${pageNum} - Blank Page]`, italics: true, color: "94A3B8" })],
          })
        );
        if (pIdx < targetPages.length - 1) {
          docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }
      }
      continue;
    }

    // Calculate median text height for body font baseline
    const heights = rawItems.map((i) => i.height).filter((h) => h > 4).sort((a, b) => a - b);
    const medianHeight = heights[Math.floor(heights.length / 2)] || 10;

    // Filter out running header/footer margins (top 3% and bottom 3%)
    const pageHeight = viewport.height;
    const bodyItems = rawItems.filter(
      (item) => item.y <= pageHeight * 0.97 && item.y >= pageHeight * 0.03
    );

    // Group items into lines: sort by Y descending (top to bottom), then X ascending
    bodyItems.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 4) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    const lines: ParsedLine[] = [];
    let currentItems: RawTextItem[] = [];
    let currentY: number | null = null;

    for (const item of bodyItems) {
      if (currentY === null || Math.abs(currentY - item.y) <= 4) {
        currentItems.push(item);
        currentY = item.y;
      } else {
        if (currentItems.length > 0) {
          lines.push(classifyLine(currentItems, medianHeight, detectTables));
        }
        currentItems = [item];
        currentY = item.y;
      }
    }
    if (currentItems.length > 0) {
      lines.push(classifyLine(currentItems, medianHeight, detectTables));
    }

    // If page-preserved mode, add explicit page header callout
    if (layoutMode === "page_preserved" && targetPages.length > 1) {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: `Page ${pageNum}`,
              bold: true,
              size: 20,
              font: activeTheme.heading,
              color: activeTheme.accentColor,
            }),
          ],
        })
      );
    }

    // Build Word elements: paragraphs, headings, bullet lists, and tables
    let lineIdx = 0;
    while (lineIdx < lines.length) {
      const line = lines[lineIdx];

      // 1. Table Detection: check if consecutive lines form a tabular grid
      if (detectTables && line.isTableCandidate && line.columns && line.columns.length >= 2) {
        const tableLines: ParsedLine[] = [line];
        let nextIdx = lineIdx + 1;
        while (
          nextIdx < lines.length &&
          lines[nextIdx].isTableCandidate &&
          lines[nextIdx].columns &&
          Math.abs((lines[nextIdx].columns?.length || 0) - line.columns.length) <= 1
        ) {
          tableLines.push(lines[nextIdx]);
          nextIdx++;
        }

        // If at least 2 rows align with multi-columns, render as a native Word Table
        if (tableLines.length >= 2) {
          const maxCols = Math.max(...tableLines.map((tl) => tl.columns?.length || 0));
          const colWidthPercent = Math.floor(100 / maxCols);

          const tableRows = tableLines.map((tl, rowIdx) => {
            const isHeader = rowIdx === 0;
            const cells = (tl.columns || []).map((colText) => {
              return new TableCell({
                width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                shading: isHeader ? { fill: "F1F5F9" } : undefined,
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: colText.trim(),
                        bold: isHeader,
                        size: isHeader ? 20 : 18,
                        font: activeTheme.body,
                        color: activeTheme.primaryColor,
                      }),
                    ],
                  }),
                ],
              });
            });

            // Pad missing cells if any row has fewer columns
            while (cells.length < maxCols) {
              cells.push(
                new TableCell({
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({})],
                })
              );
            }

            return new TableRow({
              tableHeader: isHeader,
              children: cells,
            });
          });

          docChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.NONE },
              },
            }),
            new Paragraph({ spacing: { after: 180 } }) // spacer after table
          );

          totalTables++;
          lineIdx = nextIdx;
          continue;
        }
      }

      // 2. Headings
      if (line.isHeading) {
        totalHeadings++;
        const hLevel =
          line.headingLevel === 1
            ? HeadingLevel.HEADING_1
            : line.headingLevel === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;

        docChildren.push(
          new Paragraph({
            heading: hLevel,
            spacing: { before: 240, after: 100 },
            children: [
              new TextRun({
                text: line.fullText,
                bold: true,
                font: activeTheme.heading,
                color: activeTheme.primaryColor,
              }),
            ],
          })
        );
        totalWords += countWords(line.fullText);
        totalCharCount += line.fullText.length;
        lineIdx++;
        continue;
      }

      // 3. Bullet / Numbered Lists
      if (line.isList) {
        totalLists++;
        docChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: line.fullText.replace(/^([•\-\*–]|\d+[\.\)])\s*/, ""),
                font: activeTheme.body,
                size: 22, // 11pt
                color: activeTheme.primaryColor,
              }),
            ],
          })
        );
        totalWords += countWords(line.fullText);
        totalCharCount += line.fullText.length;
        lineIdx++;
        continue;
      }

      // 4. Regular Paragraphs: Reflow flowing lines together if in 'flowing' mode
      let paragraphText = line.fullText;
      if (layoutMode === "flowing") {
        let peekIdx = lineIdx + 1;
        while (
          peekIdx < lines.length &&
          !lines[peekIdx].isHeading &&
          !lines[peekIdx].isList &&
          !lines[peekIdx].isTableCandidate &&
          !paragraphText.endsWith(".") &&
          !paragraphText.endsWith(":") &&
          !paragraphText.endsWith("!") &&
          !paragraphText.endsWith("?")
        ) {
          // De-hyphenate if split with hyphen
          if (paragraphText.endsWith("-")) {
            paragraphText = paragraphText.slice(0, -1) + lines[peekIdx].fullText;
          } else {
            paragraphText += " " + lines[peekIdx].fullText;
          }
          peekIdx++;
        }
        lineIdx = peekIdx;
      } else {
        lineIdx++;
      }

      if (paragraphText.trim()) {
        totalParagraphs++;
        totalWords += countWords(paragraphText);
        totalCharCount += paragraphText.length;

        docChildren.push(
          new Paragraph({
            spacing: { before: 60, after: 120, line: 276 }, // 1.15 line spacing
            children: [
              new TextRun({
                text: paragraphText.trim(),
                font: activeTheme.body,
                size: 22, // 11pt
                color: activeTheme.primaryColor,
              }),
            ],
          })
        );
      }
    }

    // Page Break between pages if preserved
    if (layoutMode === "page_preserved" && pIdx < targetPages.length - 1) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  onProgress?.(90, "Packaging and serializing .docx binary in-browser...");

  // Create Document with optional Footer Page Numbers
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch margins
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${baseName}`,
                    italics: true,
                    size: 16,
                    color: "94A3B8",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: includePageNumbers
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                        size: 18,
                        color: "94A3B8",
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        children: docChildren,
      },
    ],
  });

  const docxBlob = await Packer.toBlob(doc);
  const docxBuffer = await docxBlob.arrayBuffer();

  onProgress?.(100, "Word document conversion complete.");

  const summary = `Successfully converted ${targetPages.length} PDF pages into an editable Word document (${totalWords.toLocaleString()} words, ${totalHeadings} headings, ${totalTables} tables, ${totalLists} list items).`;

  return {
    docxBlob,
    docxBuffer,
    fileName: `${baseName}_converted.docx`,
    totalPages: targetPages.length,
    totalWords,
    totalChars: totalCharCount,
    headingsCount: totalHeadings,
    tablesCount: totalTables,
    listsCount: totalLists,
    paragraphsCount: totalParagraphs,
    summary,
  };
}

/**
 * Classifies a group of text items sharing the same vertical line
 */
function classifyLine(items: RawTextItem[], medianHeight: number, detectTables: boolean): ParsedLine {
  items.sort((a, b) => a.x - b.x);
  const fullText = items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
  const maxHeight = Math.max(...items.map((i) => i.height));

  // 1. Heading Detection
  let isHeading = false;
  let headingLevel: 1 | 2 | 3 | undefined;

  if (maxHeight >= medianHeight * 1.5 || maxHeight >= 18) {
    isHeading = true;
    headingLevel = 1;
  } else if (maxHeight >= medianHeight * 1.25 || maxHeight >= 14) {
    isHeading = true;
    headingLevel = 2;
  } else if (
    (maxHeight >= medianHeight * 1.1 || items.some((i) => i.fontName.toLowerCase().includes("bold"))) &&
    fullText.length < 80 &&
    !fullText.endsWith(".")
  ) {
    isHeading = true;
    headingLevel = 3;
  }

  // 2. List Detection
  const isList = /^([•\-\*–\u2022]|\d+[\.\)])\s+/.test(fullText);

  // 3. Table Candidate Detection: multiple items with substantial horizontal spacing
  let isTableCandidate = false;
  let columns: string[] | undefined;

  if (detectTables && !isHeading && !isList && items.length >= 2) {
    const gaps: number[] = [];
    for (let i = 0; i < items.length - 1; i++) {
      const gap = items[i + 1].x - (items[i].x + items[i].width);
      if (gap > 20) {
        gaps.push(gap);
      }
    }

    if (gaps.length >= 1) {
      // Split items into column buckets based on large gaps (> 20pt)
      const colBuckets: string[] = [];
      let currentBucket = items[0].str;
      for (let i = 0; i < items.length - 1; i++) {
        const gap = items[i + 1].x - (items[i].x + items[i].width);
        if (gap > 20) {
          colBuckets.push(currentBucket.trim());
          currentBucket = items[i + 1].str;
        } else {
          currentBucket += " " + items[i + 1].str;
        }
      }
      colBuckets.push(currentBucket.trim());

      if (colBuckets.filter((c) => c.length > 0).length >= 2) {
        isTableCandidate = true;
        columns = colBuckets;
      }
    }
  }

  return {
    y: items[0].y,
    items,
    fullText,
    maxHeight,
    isHeading,
    headingLevel,
    isList,
    isTableCandidate,
    columns,
  };
}

function countWords(str: string): number {
  return str.split(/\s+/).filter(Boolean).length;
}
