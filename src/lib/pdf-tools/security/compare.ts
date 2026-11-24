import { extractTextFromPdf } from "../common/pdfjs-loader.ts";

/**
 * Compare two PDF documents with vocabulary similarity and sentence-by-sentence diff
 */
export async function comparePdf(
  file1: File,
  file2: File
): Promise<{
  reportText: string;
  doc1Pages: number;
  doc2Pages: number;
  similarityScore: number;
  wordCount1: number;
  wordCount2: number;
  addedLinesCount: number;
  removedLinesCount: number;
}> {
  const t1 = await extractTextFromPdf(file1);
  const t2 = await extractTextFromPdf(file2);

  const words1 = t1.text.split(/\s+/).filter(Boolean);
  const words2 = t2.text.split(/\s+/).filter(Boolean);

  const set1 = new Set(words1.map((w) => w.toLowerCase()));
  const set2 = new Set(words2.map((w) => w.toLowerCase()));

  let matches = 0;
  for (const w of set1) {
    if (set2.has(w)) matches++;
  }

  const similarityScore = set1.size > 0 ? Math.round((matches / Math.max(set1.size, set2.size)) * 100) : 100;

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

  const removedSentences = sentences1.filter((s) => !sSet2.has(s)).slice(0, 5);
  const addedSentences = sentences2.filter((s) => !sSet1.has(s)).slice(0, 5);

  const reportText = `# PDF Comparison Report

## Document Comparison Summary
- **File 1**: ${file1.name} (${t1.pages.length} pages, ${words1.length} words)
- **File 2**: ${file2.name} (${t2.pages.length} pages, ${words2.length} words)
- **Vocabulary Similarity**: ${similarityScore}%
- **Page Delta**: ${Math.abs(t1.pages.length - t2.pages.length)} page(s)
- **Word Delta**: ${Math.abs(words1.length - words2.length)} words

## Key Content Differences

### Unique to ${file1.name} (Removed or altered):
${removedSentences.length > 0 ? removedSentences.map((s) => `- 🔴 ${s}`).join("\n") : "_No exclusive sentences found._"}

### Unique to ${file2.name} (Added or new):
${addedSentences.length > 0 ? addedSentences.map((s) => `- 🟢 ${s}`).join("\n") : "_No exclusive sentences found._"}

## Content Preview
**${file1.name}**: ${t1.text.slice(0, 250)}...

**${file2.name}**: ${t2.text.slice(0, 250)}...
`;

  return {
    reportText,
    doc1Pages: t1.pages.length,
    doc2Pages: t2.pages.length,
    similarityScore,
    wordCount1: words1.length,
    wordCount2: words2.length,
    addedLinesCount: addedSentences.length,
    removedLinesCount: removedSentences.length,
  };
}
