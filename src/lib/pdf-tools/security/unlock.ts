/**
 * Decrypt and remove password restrictions from PDF
 */
export async function unlockPdf(
  file: File,
  password: string = ""
): Promise<{ pdfBytes: Uint8Array; fileName: string }> {
  const buffer = await file.arrayBuffer();
  const { decryptPDF } = await import("@pdfsmaller/pdf-decrypt");
  const decryptedBytes = await decryptPDF(new Uint8Array(buffer), password);
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes: decryptedBytes,
    fileName: `${baseName}_unlocked.pdf`,
  };
}
