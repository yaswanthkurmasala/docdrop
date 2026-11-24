import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";
import * as XLSX from "xlsx";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

/**
 * Generates an in-memory real PDF file for instant 1-click testing in the browser
 */
export async function createSamplePdfFile(name: string = "Sample_Document.pdf", pages: number = 4): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595, 842]); // A4
    page.drawText("DocDrop — Private In-Browser Document Suite", {
      x: 50,
      y: 780,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    });

    page.drawText(`${name.replace(".pdf", "")} • Page ${i}`, {
      x: 50,
      y: 720,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(
      `This sample document is generated locally inside your browser memory.\n\nYou can use this document to test:\n- Merging multiple files\n- Splitting by page ranges (e.g. 1-2, 3-4)\n- Rotating pages 90° or 180°\n- Stamping custom watermarks\n- Adding automated page numbers\n- Compressing document streams\n- PDF to JPG and Word conversion\n\nPage ${i} of ${pages} — 100% Client-Side In-Browser Execution.`,
      {
        x: 50,
        y: 640,
        size: 12,
        font,
        color: rgb(0.2, 0.2, 0.2),
        lineHeight: 18,
      }
    );
  }

  const bytes = await doc.save();
  return new File([bytes as any], name, { type: "application/pdf" });
}

/**
 * Generates a dummy sample image file (PNG) for testing image to PDF
 */
export function createSampleImageFile(name: string = "Sample_Slide.png"): Promise<File> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(new File([new Uint8Array(100)], name, { type: "image/png" }));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw background
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 0, 600, 400);

      // Draw border
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 580, 380);

      // Draw text
      ctx.fillStyle = "#18181b";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(name, 50, 150);

      ctx.fillStyle = "#71717a";
      ctx.font = "16px sans-serif";
      ctx.fillText("Sample visual slide generated in-browser.", 50, 200);
      ctx.fillText("100% Client-Side In-Browser Execution.", 50, 240);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], name, { type: "image/png" }));
      } else {
        resolve(new File([new Uint8Array(100)], name, { type: "image/png" }));
      }
    }, "image/png");
  });
}

/**
 * Generates a real Word (.docx) document for testing Word to PDF
 */
export async function createSampleWordFile(name: string = "Sample_Executive_Brief.docx"): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "DocDrop — Executive Strategy Document",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Client-side confidential memorandum generated for conversion testing.",
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            text: "1. Overview & Architecture",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "This document demonstrates client-side Word-to-PDF rendering in browser memory. No file data leaves the local device.",
          }),
          new Paragraph({
            text: "2. Key Deliverables",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "• High fidelity typography preservation\n• 100% privacy compliance\n• Zero cloud upload latency",
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return new File([blob], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Generates a real Excel (.xlsx) workbook for testing Excel to PDF
 */
export async function createSampleExcelFile(name: string = "Sample_Q4_Financials.xlsx"): Promise<File> {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Quarter", "Department", "Budget ($)", "Actual ($)", "Variance (%)"],
    ["Q1 2026", "Engineering", 120000, 114500, "-4.5%"],
    ["Q1 2026", "Marketing", 45000, 48200, "+7.1%"],
    ["Q2 2026", "Engineering", 130000, 128000, "-1.5%"],
    ["Q2 2026", "Product", 60000, 57400, "-4.3%"],
    ["Q3 2026", "Operations", 35000, 34100, "-2.5%"],
    ["Q4 2026", "Total", 390000, 382200, "-2.0%"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Financials");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new File([wbout], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Generates an encrypted sample PDF with password "123456" for testing Unlock PDF
 */
export async function createSampleProtectedPdfFile(
  name: string = "Locked_Contract_password_123456.pdf",
  password: string = "123456"
): Promise<File> {
  const plainPdf = await createSamplePdfFile("Confidential_Agreement.pdf", 3);
  const buf = await plainPdf.arrayBuffer();
  const encryptedBytes = await encryptPDF(new Uint8Array(buf), password, {
    algorithm: "AES-256",
  });
  return new File([encryptedBytes as any], name, { type: "application/pdf" });
}

/**
 * Generates a sample HTML document file
 */
export function createSampleHtmlFile(name: string = "Sample_Webpage.html"): File {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sample Webpage</title>
  <style>
    body { font-family: sans-serif; padding: 30px; line-height: 1.6; }
    h1 { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f3f4f6; }
  </style>
</head>
<body>
  <h1>DocDrop HTML Export</h1>
  <p>This is a sample HTML document converted directly into a PDF in client-side browser memory.</p>
  <table>
    <tr><th>Feature</th><th>Status</th></tr>
    <tr><td>Client-Side Parsing</td><td>Active</td></tr>
    <tr><td>Privacy Assurance</td><td>100% Guaranteed</td></tr>
  </table>
</body>
</html>`;
  return new File([htmlContent], name, { type: "text/html" });
}
