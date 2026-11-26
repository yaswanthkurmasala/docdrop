import { extractTextFromPdf } from "../common/pdfjs-loader.ts";

export interface ComparePdfOptions {
  sensitivity?: "sentence" | "word" | "line";
  maxDifferences?: number;
  onProgress?: (percent: number, message: string) => void;
}

export interface ComparePdfResult {
  reportText: string;
  doc1Pages: number;
  doc2Pages: number;
  similarityScore: number;
  wordCount1: number;
  wordCount2: number;
  addedLinesCount: number;
  removedLinesCount: number;
  fileName: string;
  summary: string;
}

/**
 * Compare two PDF documents with vocabulary similarity and sentence-by-sentence diff
 */
export async function comparePdf(
  file1: File,
  file2: File,
  options?: ComparePdfOptions
): Promise<ComparePdfResult> {
  const onProgress = options?.onProgress;
  const maxDiffs = options?.maxDifferences ?? 8;

  onProgress?.(15, `Extracting text streams from ${file1.name}...`);
  const t1 = await extractTextFromPdf(file1);

  onProgress?.(45, `Extracting text streams from ${file2.name}...`);
  const t2 = await extractTextFromPdf(file2);

  onProgress?.(70, "Computing vocabulary frequencies & structural diffs...");
  const words1 = t1.text.split(/\s+/).filter(Boolean);
  const words2 = t2.text.split(/\s+/).filter(Boolean);

  const set1 = new Set(words1.map((w) => w.toLowerCase()));
  const set2 = new Set(words2.map((w) => w.toLowerCase()));

  let matches = 0;
  for (const w of set1) {
    if (set2.has(w)) matches++;
  }

  const similarityScore =
    set1.size > 0 ? Math.round((matches / Math.max(set1.size, set2.size)) * 100) : 100;

  // Split into sentences for detailed diff
  const sentences1 = t1.text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
  const sentences2 = t2.text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const sSet1 = new Set(sentences1);
  const sSet2 = new Set(sentences2);

  const removedSentences = sentences1.filter((s) => !sSet2.has(s)).slice(0, maxDiffs);
  const addedSentences = sentences2.filter((s) => !sSet1.has(s)).slice(0, maxDiffs);

  onProgress?.(90, "Synthesizing side-by-side comparison report...");
  const reportText = `# PDF Comparison Audit Report

## Document Comparison Summary
- **Primary Document (File 1)**: ${file1.name} (${t1.pages.length} pages, ${words1.length.toLocaleString()} words)
- **Comparison Target (File 2)**: ${file2.name} (${t2.pages.length} pages, ${words2.length.toLocaleString()} words)
- **Vocabulary Similarity Score**: ${similarityScore}%
- **Page Delta**: ${Math.abs(t1.pages.length - t2.pages.length)} page(s)
- **Word Delta**: ${Math.abs(words1.length - words2.length).toLocaleString()} words

## Key Content Differences

### Unique to ${file1.name} (Removed or altered):
${
  removedSentences.length > 0
    ? removedSentences.map((s) => `- 🔴 ${s}`).join("\n")
    : "_No exclusive sentences found._"
}

### Unique to ${file2.name} (Added or new):
${
  addedSentences.length > 0
    ? addedSentences.map((s) => `- 🟢 ${s}`).join("\n")
    : "_No exclusive sentences found._"
}

## Content Preview
**${file1.name}**:
> ${t1.text.slice(0, 300)}...

**${file2.name}**:
> ${t2.text.slice(0, 300)}...
`;

  onProgress?.(100, "Done!");
  const summary = `Comparison complete: ${similarityScore}% similarity across ${t1.pages.length} vs ${t2.pages.length} pages (${addedSentences.length} added, ${removedSentences.length} removed sentences)`;

  return {
    reportText,
    doc1Pages: t1.pages.length,
    doc2Pages: t2.pages.length,
    similarityScore,
    wordCount1: words1.length,
    wordCount2: words2.length,
    addedLinesCount: addedSentences.length,
    removedLinesCount: removedSentences.length,
    fileName: `comparison_${file1.name.replace(/\.[^/.]+$/, "")}_vs_${file2.name.replace(/\.[^/.]+$/, "")}.md`,
    summary,
  };
}
