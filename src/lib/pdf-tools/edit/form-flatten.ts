import { PDFDocument } from "pdf-lib";

export type FormProcessingAction = "flatten" | "audit_only" | "clear_values";

export interface FormFieldItem {
  name: string;
  type: string;
  isReadOnly?: boolean;
}

export interface InspectAndFlattenOptions {
  action?: FormProcessingAction;
  onProgress?: (percent: number, message: string) => void;
}

export interface InspectAndFlattenResult {
  pdfBytes: Uint8Array;
  fileName: string;
  fieldCount: number;
  fieldSummary: string;
  fieldList: FormFieldItem[];
  totalPages: number;
  actionUsed: FormProcessingAction;
  summary: string;
}

/**
 * Inspect AcroForm widgets, audit field structures, and flatten interactive fields
 */
export async function inspectAndFlattenPdfForms(
  file: File,
  options?: InspectAndFlattenOptions
): Promise<InspectAndFlattenResult> {
  const action = options?.action ?? "flatten";
  const onProgress = options?.onProgress;

  onProgress?.(15, "Loading PDF catalog and AcroForm dictionary...");
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();

  let fieldCount = 0;
  const fieldList: FormFieldItem[] = [];

  onProgress?.(45, "Auditing interactive form elements & widgets...");
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    fieldCount = fields.length;

    fields.forEach((f) => {
      const name = f.getName();
      const rawType = f.constructor.name.replace(/^PDF/, "");
      let isReadOnly = false;
      try {
        isReadOnly = f.isReadOnly();
      } catch {
        // Ignored
      }
      fieldList.push({
        name: name || "Unnamed Field",
        type: rawType || "Widget",
        isReadOnly,
      });
    });

    if (action === "flatten") {
      onProgress?.(70, "Burning interactive fields into static vector graphics...");
      form.flatten();
    } else if (action === "clear_values") {
      onProgress?.(70, "Sanitizing and resetting form field values...");
      // Attempt to clear text fields where supported
      fields.forEach((f: any) => {
        try {
          if (typeof f.setText === "function") {
            f.setText("");
          } else if (typeof f.uncheck === "function") {
            f.uncheck();
          }
        } catch {
          // Skip unsupported fields
        }
      });
    } else {
      onProgress?.(70, "Compiling security audit report for AcroForm...");
    }
  } catch {
    // No AcroForm structure present in document
  }

  onProgress?.(90, "Serializing output PDF stream in client RAM...");
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, "Done!");

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  let actionLabel = "flattened";
  if (action === "audit_only") actionLabel = "audited";
  if (action === "clear_values") actionLabel = "sanitized";

  const fieldSummary =
    fieldCount > 0
      ? `Discovered ${fieldCount} interactive form field(s):\n${fieldList
          .slice(0, 10)
          .map((f) => `- **${f.name}** (${f.type}${f.isReadOnly ? " - ReadOnly" : ""})`)
          .join("\n")}${fieldList.length > 10 ? `\n...and ${fieldList.length - 10} more` : ""}`
      : "No interactive AcroForm fields found; document verified and secured.";

  const summary =
    action === "flatten"
      ? `Flattened ${fieldCount} form field(s) into immutable vector graphics across ${total} page(s)`
      : action === "clear_values"
      ? `Sanitized ${fieldCount} form field(s) across ${total} page(s)`
      : `Audited ${fieldCount} form field(s) across ${total} page(s) (Read-only)`;

  return {
    pdfBytes,
    fileName: `${baseName}_${actionLabel}.pdf`,
    fieldCount,
    fieldSummary,
    fieldList,
    totalPages: total,
    actionUsed: action,
    summary,
  };
}
