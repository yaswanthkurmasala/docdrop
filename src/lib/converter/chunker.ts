import { estimateTokens } from "./tokenizer.ts";
import type { ChunkOptions, MarkdownChunk } from "./types.ts";

/**
 * Splits markdown text into semantic RAG chunks by token budget.
 * Tries to break at headings and paragraphs first, avoiding breaking sentences.
 */
export function chunkMarkdown(
  markdown: string,
  options: ChunkOptions = {}
): MarkdownChunk[] {
  const { chunkSizeTokens = 600, overlapTokens = 50 } = options;

  if (!markdown || markdown.trim().length === 0) return [];

  // Split on double newlines (paragraphs or headers)
  const paragraphs = markdown.split(/\n\n+/);
  const chunks: MarkdownChunk[] = [];

  let currentChunkText = "";
  let currentHeaderContext = "";
  let chunkIndex = 1;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length === 0) continue;

    // Track active header
    if (trimmed.startsWith("#")) {
      currentHeaderContext = trimmed.split("\n")[0] || "";
    }

    const candidate = currentChunkText ? `${currentChunkText}\n\n${trimmed}` : trimmed;
    const candidateTokens = estimateTokens(candidate);

    if (candidateTokens <= chunkSizeTokens) {
      currentChunkText = candidate;
    } else {
      // Chunk exceeded limit: save current chunk if it exists
      if (currentChunkText.length > 0) {
        chunks.push({
          index: chunkIndex++,
          content: currentChunkText.trim(),
          tokenCount: estimateTokens(currentChunkText),
          headerContext: currentHeaderContext,
        });

        // Provide overlap if requested
        if (overlapTokens > 0) {
          const sentences = currentChunkText.split(/(?<=[.?!])\s+/);
          const overlap = sentences.slice(-2).join(" ");
          currentChunkText = `${overlap}\n\n${trimmed}`;
        } else {
          currentChunkText = trimmed;
        }
      } else {
        // A single paragraph is larger than chunkSizeTokens, push it directly
        chunks.push({
          index: chunkIndex++,
          content: trimmed,
          tokenCount: estimateTokens(trimmed),
          headerContext: currentHeaderContext,
        });
        currentChunkText = "";
      }
    }
  }

  // Push remaining buffer
  if (currentChunkText.trim().length > 0) {
    chunks.push({
      index: chunkIndex++,
      content: currentChunkText.trim(),
      tokenCount: estimateTokens(currentChunkText),
      headerContext: currentHeaderContext,
    });
  }

  return chunks;
}
