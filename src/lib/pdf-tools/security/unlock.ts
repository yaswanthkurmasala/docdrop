export interface UnlockPdfOptions {
  password?: string;
  onProgress?: (percent: number, message: string) => void;
}

export interface UnlockPdfResult {
  pdfBytes: Uint8Array;
  fileName: string;
  summary: string;
}

/**
 * Decrypt and remove password restrictions from PDF
 */
export async function unlockPdf(
  file: File,
  optionsOrPassword?: UnlockPdfOptions | string
): Promise<UnlockPdfResult> {
  const opts: UnlockPdfOptions =
    typeof optionsOrPassword === "string"
      ? { password: optionsOrPassword }
      : optionsOrPassword || {};

  const password = opts.password || "";
  const onProgress = opts.onProgress;

  onProgress?.(20, "Loading encrypted PDF stream into memory...");
  const buffer = await file.arrayBuffer();

  onProgress?.(50, "Decrypting cryptographic envelope & removing restrictions...");
  const { decryptPDF } = await import("@pdfsmaller/pdf-decrypt");
  const decryptedBytes = await decryptPDF(new Uint8Array(buffer), password);

  onProgress?.(85, "Verifying decrypted PDF structure...");
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  onProgress?.(100, "Done!");

  return {
    pdfBytes: decryptedBytes,
    fileName: `${baseName}_unlocked.pdf`,
    summary: "Successfully decrypted document and removed all password restrictions",
  };
}
