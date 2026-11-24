import { extractTextFromPdf } from "../common/pdfjs-loader.ts";

/**
 * AI Document Summarizer using Client-Side NLP Term Frequency Salience Scoring
 */
export async function aiSummarizePdf(file: File): Promise<{
  summary: string;
  keyTakeaways: string[];
  readingTimeMinutes: number;
  tokenCount: number;
  totalPages: number;
  topKeywords: string[];
}> {
  const { text, pages } = await extractTextFromPdf(file);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const tokenCount = Math.round(wordCount * 1.33);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Common English stop words
  const stopWords = new Set([
    "the", "and", "is", "in", "to", "of", "a", "that", "it", "with", "as", "for", "on", "was",
    "by", "at", "an", "be", "this", "from", "or", "are", "which", "but", "not", "have", "had",
    "has", "we", "you", "they", "our", "their", "all", "can", "will", "one", "its", "also"
  ]);

  // Compute word frequency table
  const wordFreq: Record<string, number> = {};
  for (const w of words) {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.length > 3 && !stopWords.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  }

  // Top keywords
  const sortedKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  // Extract sentences
  const rawSentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35 && s.length <= 300);

  // Score sentences using term salience
  const scoredSentences = rawSentences.map((sentence, idx) => {
    const sWords = sentence.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ""));
    let score = 0;
    for (const sw of sWords) {
      if (wordFreq[sw]) score += wordFreq[sw];
    }
    const positionBoost = idx < 3 || idx > rawSentences.length - 4 ? 1.25 : 1.0;
    const finalScore = (score / Math.sqrt(Math.max(1, sWords.length))) * positionBoost;
    return { sentence, score: finalScore };
  });

  scoredSentences.sort((a, b) => b.score - a.score);

  const topSentences = scoredSentences.slice(0, 4).map((s) => s.sentence);
  if (topSentences.length === 0) {
    topSentences.push("Extracted structured content across document pages.");
    topSentences.push("Document parsed in browser memory with zero cloud transmission.");
  }

  const summary = `Document "${file.name}" spans ${pages.length} page(s) and approximately ${wordCount.toLocaleString()} words (~${tokenCount.toLocaleString()} estimated tokens). Primary focus areas include: ${sortedKeywords.join(", ") || "General Content"}. Estimated reading time is ${readingTimeMinutes} minute(s).`;

  return {
    summary,
    keyTakeaways: topSentences,
    readingTimeMinutes,
    tokenCount,
    totalPages: pages.length,
    topKeywords: sortedKeywords,
  };
}
