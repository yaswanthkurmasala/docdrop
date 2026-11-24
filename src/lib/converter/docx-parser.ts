import mammoth from "mammoth";
import { cleanMarkdown } from "./cleaner.ts";

/**
 * Converts HTML from mammoth into clean GitHub Flavored Markdown (tables, headings, lists, bold/italics).
 */
function htmlToMarkdown(html: string): string {
  let md = html;

  // Convert headings
  md = md.replace(/<h1>(.*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2>(.*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3>(.*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4>(.*?)<\/h4>/gi, "\n#### $1\n");

  // Convert strong/em
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");

  // Convert code
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");

  // Convert links
  md = md.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Convert unordered lists
  md = md.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, listContent) => {
    return (
      "\n" +
      listContent
        .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
        .replace(/<\/?ul>/gi, "")
        .trim() +
      "\n"
    );
  });

  // Convert ordered lists
  md = md.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, listContent) => {
    let index = 1;
    return (
      "\n" +
      listContent
        .replace(/<li>(.*?)<\/li>/gi, () => `${index++}. $1\n`)
        .replace(/<\/?ol>/gi, "")
        .trim() +
      "\n"
    );
  });

  // Convert tables
  md = md.replace(/<table>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim().replace(/\|/g, "\\|"));
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return "";

    const maxCols = Math.max(...rows.map((r) => r.length));
    const normalizedRows = rows.map((r) => {
      while (r.length < maxCols) r.push("");
      return r;
    });

    const header = "| " + normalizedRows[0].join(" | ") + " |";
    const divider = "| " + new Array(maxCols).fill("---").join(" | ") + " |";
    const body = normalizedRows
      .slice(1)
      .map((r) => "| " + r.join(" | ") + " |")
      .join("\n");

    return `\n\n${header}\n${divider}\n${body}\n\n`;
  });

  // Convert paragraphs
  md = md.replace(/<p>(.*?)<\/p>/gi, "\n\n$1\n\n");

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return cleanMarkdown(md);
}

/**
 * Parses a DOCX ArrayBuffer into clean Markdown.
 */
export async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const buffer = typeof Buffer !== "undefined" ? Buffer.from(arrayBuffer) : (arrayBuffer as any);
  const result = await mammoth.convertToHtml({
    buffer,
    arrayBuffer,
  } as any);
  return htmlToMarkdown(result.value);
}
