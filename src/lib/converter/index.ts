import { cleanMarkdown } from "./cleaner.ts";
import { parseDocx } from "./docx-parser.ts";
import { parsePdf } from "./pdf-parser.ts";
import { parseXlsx } from "./xlsx-parser.ts";
import { estimateTokens, estimateCost } from "./tokenizer.ts";
import { chunkMarkdown } from "./chunker.ts";
import type { ConversionResult, DocumentMetadata } from "./types.ts";

export * from "./types.ts";
export * from "./tokenizer.ts";
export * from "./chunker.ts";
export * from "./cleaner.ts";

/**
 * Detects file type from name or mime type
 */
export function detectFileType(fileName: string): DocumentMetadata["fileType"] {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "xlsx":
    case "xls":
      return "xlsx";
    case "csv":
      return "csv";
    case "txt":
    case "text":
    case "md":
      return "txt";
    default:
      return "unknown";
  }
}

/**
 * Converts any supported document (PDF, DOCX, XLSX, CSV, TXT) into clean, LLM-ready Markdown.
 * Runs 100% in the user's browser with zero network or server transmission.
 */
export async function convertDocument(
  fileOrBuffer: File | ArrayBuffer,
  customName?: string
): Promise<ConversionResult> {
  const startTime = performance.now();
  const fileName = customName || (fileOrBuffer instanceof File ? fileOrBuffer.name : "document");
  const fileSize = fileOrBuffer instanceof File ? fileOrBuffer.size : fileOrBuffer.byteLength;
  const fileType = detectFileType(fileName);

  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  let rawMarkdown = "";
  let pageCount: number | undefined;
  let sheetNames: string[] | undefined;

  switch (fileType) {
    case "pdf": {
      const pdfRes = await parsePdf(arrayBuffer);
      rawMarkdown = pdfRes.markdown;
      pageCount = pdfRes.pageCount;
      break;
    }
    case "docx": {
      rawMarkdown = await parseDocx(arrayBuffer);
      break;
    }
    case "xlsx":
    case "csv": {
      const xlsxRes = parseXlsx(arrayBuffer);
      rawMarkdown = xlsxRes.markdown;
      sheetNames = xlsxRes.sheetNames;
      break;
    }
    case "txt": {
      const decoder = new TextDecoder("utf-8");
      rawMarkdown = cleanMarkdown(decoder.decode(arrayBuffer));
      break;
    }
    default: {
      throw new Error(
        `Unsupported format ".${fileName.split(".").pop()}". Please upload a PDF, DOCX, XLSX, or CSV file.`
      );
    }
  }

  const durationMs = Math.round(performance.now() - startTime);
  const words = rawMarkdown.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = rawMarkdown.length;
  const tokenCount = estimateTokens(rawMarkdown);

  const metadata: DocumentMetadata = {
    fileName,
    fileSize,
    fileType,
    pageCount,
    sheetNames,
    durationMs,
  };

  return {
    markdown: rawMarkdown,
    tokenCount,
    wordCount,
    charCount,
    metadata,
  };
}
