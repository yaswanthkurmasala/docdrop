import { PDFDocument } from "pdf-lib";
import { convertImagesToPdf } from "../convert-to/images-to-pdf.ts";
import { loadPdfJs } from "./pdfjs-loader.ts";

/**
 * Detects whether a file or byte array is an image (JPEG, PNG, WebP, GIF, BMP).
 */
export function isImageFile(
  fileOrBytes: File | Blob | Uint8Array | ArrayBuffer,
  fileName?: string
): boolean {
  if (fileOrBytes instanceof File || fileOrBytes instanceof Blob) {
    if (fileOrBytes.type && fileOrBytes.type.startsWith("image/")) {
      return true;
    }
  }

  const name =
    fileName ||
    (fileOrBytes instanceof File ? fileOrBytes.name : "") ||
    "";
  if (name) {
    const extMatch = name.toLowerCase().match(/\.(jpe?g|png|webp|bmp|gif|tiff?|heic)$/);
    if (extMatch) return true;
  }

  let bytes: Uint8Array;
  if (fileOrBytes instanceof Uint8Array) {
    bytes = fileOrBytes;
  } else if (fileOrBytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileOrBytes);
  } else {
    return false;
  }

  if (bytes.length < 4) return false;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // GIF: 47 49 46 (GIF87a / GIF89a)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  // BMP: 42 4D (BM)
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return true;
  // WebP: RIFF .... WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  // TIFF: 49 49 2A 00 (little endian) or 4D 4D 00 2A (big endian)
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  ) {
    return true;
  }
  // HEIC / HEIF / AVIF: [4-11] contains 'ftyp'
  if (bytes.length >= 12) {
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (ftyp === "ftyp") {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
      if (
        brand.startsWith("heic") ||
        brand.startsWith("heix") ||
        brand.startsWith("mif1") ||
        brand.startsWith("msf1") ||
        brand.startsWith("avif")
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Searches for '%PDF-' header in byte stream.
 * Scans up to the first 4 MB of the file to accommodate wrapper headers,
 * EXIF metadata, camera containers, and offset payloads (e.g. offset=170536).
 * Returns the offset index or -1 if not found.
 */
export function findPdfHeaderOffset(bytes: Uint8Array): number {
  const maxScan = Math.min(bytes.length - 4, 4 * 1024 * 1024);
  for (let i = 0; i < maxScan; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Ensures input bytes are a clean, valid PDF buffer.
 * Automatically wraps images (e.g. phone camera scans) into a PDF page,
 * strips leading offset garbage before '%PDF-', and yields valid PDF bytes.
 */
export async function ensureCleanPdfBytes(
  input: File | Blob | ArrayBuffer | Uint8Array,
  fileName?: string
): Promise<{ bytes: Uint8Array; wasConverted: boolean; fileName: string }> {
  const name =
    fileName ||
    (input instanceof File ? input.name : "document.pdf") ||
    "document.pdf";

  // 1. If it's a File or Blob, check if it's an image
  if (input instanceof File || input instanceof Blob) {
    let rawBytes: Uint8Array;
    const arrayBuf = await input.arrayBuffer();
    rawBytes = new Uint8Array(arrayBuf);

    if (isImageFile(input, name) || isImageFile(rawBytes, name)) {
      const dummyFile =
        input instanceof File
          ? input
          : new File([input], name, { type: input.type || "image/jpeg" });
      const converted = await convertImagesToPdf([dummyFile], { pageSize: "a4", margin: "none" });
      const newName = name.replace(/\.[^/.]+$/, "") + ".pdf";
      return { bytes: converted.pdfBytes, wasConverted: true, fileName: newName };
    }

    // Check for offset %PDF-
    const offset = findPdfHeaderOffset(rawBytes);
    if (offset > 0) {
      const cleanBytes = rawBytes.subarray(offset);
      return { bytes: cleanBytes, wasConverted: false, fileName: name };
    }
    if (offset === 0) {
      return { bytes: rawBytes, wasConverted: false, fileName: name };
    }

    throw new Error(
      `The file "${name}" does not contain a valid PDF structure or recognized image format. Please upload a standard PDF, JPG, or PNG document.`
    );
  }

  // 2. Direct byte array / ArrayBuffer
  const rawBytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (isImageFile(rawBytes, name)) {
    const dummyFile = new File([rawBytes as any], name, { type: "image/jpeg" });
    const converted = await convertImagesToPdf([dummyFile], { pageSize: "a4", margin: "none" });
    const newName = name.replace(/\.[^/.]+$/, "") + ".pdf";
    return { bytes: converted.pdfBytes, wasConverted: true, fileName: newName };
  }

  const offset = findPdfHeaderOffset(rawBytes);
  if (offset > 0) {
    return { bytes: rawBytes.subarray(offset), wasConverted: false, fileName: name };
  }
  if (offset === 0) {
    return { bytes: rawBytes, wasConverted: false, fileName: name };
  }

  throw new Error(
    `The file "${name}" is not a valid PDF document. Please verify that the file is not corrupted.`
  );
}

/**
 * Ensures an input File is converted to a valid, clean PDF File.
 * Ideal for components receiving files from phone transfer, dropzones, or chained workflows.
 */
export async function ensureValidPdfFile(file: File): Promise<File> {
  const { bytes, wasConverted, fileName } = await ensureCleanPdfBytes(file, file.name);
  if (wasConverted || bytes.byteLength !== file.size) {
    return new File([bytes as any], fileName, { type: "application/pdf" });
  }
  return file;
}

/**
 * Safely loads a PDFDocument using pdf-lib, automatically resolving images and offset headers.
 */
export async function safeLoadPdfDoc(
  fileOrBytes: File | Blob | ArrayBuffer | Uint8Array,
  options?: { ignoreEncryption?: boolean; updateMetadata?: boolean }
): Promise<PDFDocument> {
  const name = fileOrBytes instanceof File ? fileOrBytes.name : "document.pdf";
  const { bytes } = await ensureCleanPdfBytes(fileOrBytes, name);

  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption: options?.ignoreEncryption ?? true,
      updateMetadata: options?.updateMetadata ?? false,
    });
  } catch (err: any) {
    if (err?.message?.includes("No PDF header found")) {
      throw new Error(
        `Unable to parse document: No PDF header found. The file appears to be corrupted or in an unsupported format.`
      );
    }
    throw err;
  }
}

/**
 * Safely loads a pdfjs-dist document, automatically resolving images and offset headers.
 */
export async function safeLoadPdfJs(
  fileOrBytes: File | Blob | ArrayBuffer | Uint8Array,
  options?: any
) {
  const name = fileOrBytes instanceof File ? fileOrBytes.name : "document.pdf";
  const { bytes } = await ensureCleanPdfBytes(fileOrBytes, name);
  const pdfjs = await loadPdfJs();
  return await pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
    ...(options || {}),
  }).promise;
}
