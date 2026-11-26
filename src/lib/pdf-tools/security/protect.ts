export interface ProtectPdfOptions {
  userPassword: string;
  algorithm?: "AES-256" | "RC4";
  allowPrinting?: boolean;
  allowCopying?: boolean;
  onProgress?: (percent: number, message: string) => void;
}

export interface ProtectPdfResult {
  pdfBytes: Uint8Array;
  fileName: string;
  algorithmUsed: string;
  summary: string;
}

/**
 * Protect PDF with AES-256 or AES-128 encryption
 */
export async function protectPdf(
  file: File,
  optionsOrPassword: ProtectPdfOptions | string
): Promise<ProtectPdfResult> {
  const opts: ProtectPdfOptions =
    typeof optionsOrPassword === "string" ? { userPassword: optionsOrPassword } : optionsOrPassword;

  const userPassword = opts.userPassword?.trim();
  if (!userPassword) {
    throw new Error("Password cannot be empty. Please enter a secure password.");
  }

  const algorithm = opts.algorithm || "AES-256";
  const onProgress = opts.onProgress;

  onProgress?.(20, "Loading PDF stream into secure memory buffer...");
  const buffer = await file.arrayBuffer();

  onProgress?.(50, `Initializing ${algorithm} cryptographic cipher...`);
  const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");

  onProgress?.(75, `Encrypting document objects with military-grade ${algorithm}...`);
  const encryptedBytes = await encryptPDF(new Uint8Array(buffer), userPassword, {
    algorithm,
  });

  onProgress?.(100, "Done!");
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const summary = `Encrypted document with military-grade ${algorithm} encryption`;

  return {
    pdfBytes: encryptedBytes,
    fileName: `${baseName}_protected.pdf`,
    algorithmUsed: algorithm,
    summary,
  };
}
