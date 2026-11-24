import { PDFDocument } from "pdf-lib";

/**
 * Inspect AcroForm widgets and flatten all interactive fields
 */
export async function inspectAndFlattenPdfForms(
  file: File
): Promise<{
  pdfBytes: Uint8Array;
  fileName: string;
  fieldCount: number;
  fieldSummary: string;
  totalPages: number;
}> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();

  let fieldCount = 0;
  const fieldList: string[] = [];

  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    fieldCount = fields.length;

    fields.forEach((f) => {
      const name = f.getName();
      const type = f.constructor.name.replace("PDF", "");
      fieldList.push(`- **${name}** (${type})`);
    });

    form.flatten();
  } catch {
    // If no interactive form present
  }

  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const fieldSummary =
    fieldCount > 0
      ? `Found and secured ${fieldCount} form field(s):\n${fieldList.slice(0, 10).join("\n")}`
      : "No interactive form fields found; document flattened and secured.";

  return {
    pdfBytes,
    fileName: `${baseName}_flattened.pdf`,
    fieldCount,
    fieldSummary,
    totalPages: total,
  };
}
