export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: "pdf" | "docx" | "xlsx" | "csv" | "txt" | "unknown";
  pageCount?: number;
  sheetNames?: string[];
  durationMs?: number;
}

export interface ConversionResult {
  markdown: string;
  tokenCount: number;
  wordCount: number;
  charCount: number;
  metadata: DocumentMetadata;
}

export interface ChunkOptions {
  chunkSizeTokens?: number;
  overlapTokens?: number;
}

export interface MarkdownChunk {
  index: number;
  content: string;
  tokenCount: number;
  headerContext?: string;
}
