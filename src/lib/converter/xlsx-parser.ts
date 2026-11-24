import * as XLSX from "xlsx";
import { cleanMarkdown } from "./cleaner.ts";

export interface XlsxParseResult {
  markdown: string;
  sheetNames: string[];
}

/**
 * Formats a 2D array of rows into a clean GitHub Flavored Markdown table.
 */
function tableToMarkdown(rows: (string | number | boolean | null | undefined)[][]): string {
  if (!rows || rows.length === 0) return "";

  // Filter out completely empty rows
  const cleanRows = rows
    .map((row) => row.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : "")))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (cleanRows.length === 0) return "";

  const maxCols = Math.max(...cleanRows.map((r) => r.length));
  if (maxCols === 0) return "";

  const paddedRows = cleanRows.map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push("");
    return copy.map((cell) => cell.replace(/\|/g, "\\|"));
  });

  const header = "| " + paddedRows[0].join(" | ") + " |";
  const divider = "| " + new Array(maxCols).fill("---").join(" | ") + " |";
  const body = paddedRows
    .slice(1)
    .map((r) => "| " + r.join(" | ") + " |")
    .join("\n");

  return `${header}\n${divider}\n${body}\n`;
}

/**
 * Parses XLSX / XLS / CSV ArrayBuffer into clean Markdown tables organized by sheet.
 */
export function parseXlsx(data: ArrayBuffer | Uint8Array): XlsxParseResult {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetNames = workbook.SheetNames;
  const sections: string[] = [];

  for (const name of sheetNames) {
    const worksheet = workbook.Sheets[name];
    if (!worksheet) continue;

    // Convert to JSON array of arrays
    const jsonRows = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(worksheet, {
      header: 1,
      defval: "",
    });

    if (jsonRows.length === 0) continue;

    const tableMd = tableToMarkdown(jsonRows);
    if (tableMd.trim().length > 0) {
      if (sheetNames.length > 1) {
        sections.push(`### Sheet: ${name}\n\n${tableMd}`);
      } else {
        sections.push(tableMd);
      }
    }
  }

  const combined = sections.join("\n\n");
  return {
    markdown: cleanMarkdown(combined),
    sheetNames,
  };
}
