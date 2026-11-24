import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import {
  splitPdf,
  rotatePdf,
  removePagesFromPdf,
  watermarkPdf,
  addPageNumbersToPdf,
  convertImagesToPdf,
  compressPdf,
  repairPdf,
  protectPdf,
  unlockPdf,
  convertWordToPdf,
  convertExcelToPdf,
  convertHtmlToPdf,
  convertPdfToPdfA,
  cropPdf,
  signPdf,
  redactPdf,
} from "../src/lib/pdf-tools/suite.ts";
import { mergePdfFiles } from "../src/lib/pdf-tools/merge-pdf.ts";
import {
  createSamplePdfFile,
  createSampleWordFile,
  createSampleExcelFile,
  createSampleProtectedPdfFile,
  createSampleHtmlFile,
} from "../src/lib/pdf-tools/sample-pdf.ts";

async function runAllTests() {
  console.log("=== STARTING COMPREHENSIVE PDF & DOC SUITE VERIFICATION ===\n");
  let passedCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  // 1. Sample PDF Generation
  let samplePdf;
  await test("Sample PDF Generator (4 pages)", async () => {
    samplePdf = await createSamplePdfFile("Test_Report.pdf", 4);
    if (!samplePdf || samplePdf.size < 100) throw new Error("Invalid sample PDF size");
  });

  // 2. Split PDF
  await test("Split PDF (extract pages 1-2)", async () => {
    const res = await splitPdf(samplePdf, "1-2");
    if (res.pageCount !== 2) throw new Error(`Expected 2 pages, got ${res.pageCount}`);
    if (!res.pdfBytes || res.pdfBytes.length < 100) throw new Error("Empty PDF bytes");
  });

  // 3. Rotate PDF
  await test("Rotate PDF (90 degrees)", async () => {
    const res = await rotatePdf(samplePdf, 90);
    if (res.totalPages !== 4) throw new Error(`Expected 4 pages, got ${res.totalPages}`);
  });

  // 4. Remove Pages
  await test("Remove Pages (remove page 2)", async () => {
    const res = await removePagesFromPdf(samplePdf, "2");
    if (res.remainingPages !== 3) throw new Error(`Expected 3 pages, got ${res.remainingPages}`);
  });

  // 5. Watermark PDF
  await test("Watermark PDF (CONFIDENTIAL)", async () => {
    const res = await watermarkPdf(samplePdf, "CONFIDENTIAL", 0.3);
    if (res.totalPages !== 4) throw new Error(`Expected 4 pages, got ${res.totalPages}`);
  });

  // 6. Page Numbers
  await test("Add Page Numbers (bottom-center)", async () => {
    const res = await addPageNumbersToPdf(samplePdf, "bottom-center");
    if (res.totalPages !== 4) throw new Error(`Expected 4 pages, got ${res.totalPages}`);
  });

  // 7. Compress PDF
  await test("Compress PDF Streams", async () => {
    const res = await compressPdf(samplePdf);
    if (!res.pdfBytes || res.compressedSize <= 0) throw new Error("Compression failed");
  });

  // 8. Repair PDF
  await test("Repair PDF xref tables", async () => {
    const res = await repairPdf(samplePdf);
    if (!res.pdfBytes || res.repairedSize <= 0) throw new Error("Repair failed");
  });

  // 9. Crop PDF
  await test("Crop PDF margins", async () => {
    const res = await cropPdf(samplePdf, 36);
    if (res.totalPages !== 4) throw new Error(`Expected 4 pages, got ${res.totalPages}`);
  });

  // 10. Sign PDF
  await test("Sign PDF with Digital Certification", async () => {
    const res = await signPdf(samplePdf, "Alex Morgan", false, 1);
    if (res.totalPages !== 4) throw new Error(`Expected 4 pages, got ${res.totalPages}`);
  });

  // 11. Redact PDF
  await test("Redact Sensitive PDF Content", async () => {
    const res = await redactPdf(samplePdf, 1);
    if (!res.pdfBytes || res.pdfBytes.length < 100) throw new Error("Redaction failed");
  });

  // 12. Protect PDF (AES-256)
  let protectedPdf;
  await test("Protect PDF (AES-256 Encryption)", async () => {
    const res = await protectPdf(samplePdf, "secretPass123");
    if (!res.pdfBytes || res.pdfBytes.length < 100) throw new Error("Protection failed");
    protectedPdf = new File([res.pdfBytes], "Encrypted.pdf", { type: "application/pdf" });
  });

  // 13. Unlock PDF
  await test("Unlock PDF with Password", async () => {
    const res = await unlockPdf(protectedPdf, "secretPass123");
    if (!res.pdfBytes || res.pdfBytes.length < 100) throw new Error("Unlock failed");
    const doc = await PDFDocument.load(res.pdfBytes);
    if (doc.getPageCount() !== 4) throw new Error("Unlocked doc page count mismatch");
  });

  // 14. Merge PDF Files
  await test("Merge PDF Files (2 files into 1)", async () => {
    const pdf1 = await createSamplePdfFile("File1.pdf", 2);
    const pdf2 = await createSamplePdfFile("File2.pdf", 3);
    const res = await mergePdfFiles([pdf1, pdf2]);
    if (res.totalPages !== 5) throw new Error(`Expected 5 total pages, got ${res.totalPages}`);
    if (res.totalFiles !== 2) throw new Error(`Expected 2 files, got ${res.totalFiles}`);
  });

  // 15. Word (.docx) to PDF
  await test("Convert Word (.docx) to PDF", async () => {
    const wordFile = await createSampleWordFile("Sample.docx");
    const res = await convertWordToPdf(wordFile);
    if (res.totalPages < 1) throw new Error("Word to PDF failed");
  });

  // 16. Excel (.xlsx) to PDF
  await test("Convert Excel (.xlsx) to PDF", async () => {
    const excelFile = await createSampleExcelFile("Sample.xlsx");
    const res = await convertExcelToPdf(excelFile);
    if (res.totalPages < 1) throw new Error("Excel to PDF failed");
  });

  // 17. HTML to PDF
  await test("Convert HTML to PDF", async () => {
    const htmlFile = createSampleHtmlFile("Sample.html");
    const res = await convertHtmlToPdf(htmlFile);
    if (res.totalPages < 1) throw new Error("HTML to PDF failed");
  });

  // 18. PDF to PDF/A
  await test("Convert PDF to PDF/A Archival standard", async () => {
    const res = await convertPdfToPdfA(samplePdf);
    if (res.totalPages !== 4) throw new Error("PDF/A conversion failed");
  });

  console.log(`\n=== RESULTS: ${passedCount}/${totalCount} TESTS PASSED ===`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error("FATAL TEST SUITE ERROR:", e);
  process.exit(1);
});
