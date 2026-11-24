/**
 * Cleans extracted text and normalizes markdown formatting for optimal LLM context ingestion.
 */
export function cleanMarkdown(rawMarkdown: string): string {
  if (!rawMarkdown) return "";

  let cleaned = rawMarkdown;

  // 1. Remove non-printable / control characters (except newline, tab)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Remove standard page numbering patterns like "Page 1 of 12" or "— 4 —"
  cleaned = cleaned.replace(/^[ \t]*(?:Page \d+(?: of \d+)?|— \d+ —|\d+ \/ \d+)[ \t]*$/gim, "");

  // 3. Remove repeated horizontal page breaks / dashes excessive lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // 4. Fix hyphenated line-wraps (e.g. "connec-\ntion" -> "connection")
  cleaned = cleaned.replace(/(\w+)-\n[ \t]*(\w+)/g, "$1$2");

  // 5. Ensure Markdown table rows are properly trimmed
  cleaned = cleaned
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      // If line is a markdown table row, trim spaces around the outer pipes
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        return trimmed;
      }
      return line;
    })
    .join("\n");

  // 6. Final trim
  return cleaned.trim() + "\n";
}
