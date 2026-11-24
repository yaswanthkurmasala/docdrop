/**
 * Protect PDF with AES-256 user password encryption
 */
export async function protectPdf(
  file: File,
  userPassword: string
): Promise<{ pdfBytes: Uint8Array; fileName: string }> {
  if (!userPassword) {
    throw new Error("Password cannot be empty.");
  }
  const buffer = await file.arrayBuffer();
  const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
  const encryptedBytes = await encryptPDF(new Uint8Array(buffer), userPassword, {
    algorithm: "AES-256",
  });
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    pdfBytes: encryptedBytes,
    fileName: `${baseName}_protected.pdf`,
  };
}
