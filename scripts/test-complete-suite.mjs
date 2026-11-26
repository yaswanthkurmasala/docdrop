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
  convertPdfToJpg,
  convertWordToPdf,
  convertExcelToPdf,
  convertHtmlToPdf,
  convertPdfToWord,
  convertPdfToExcel,
  convertPdfToPdfA,
  cropPdf,
  signPdf,
  redactPdf,
  organizePdfPages,
  annotatePdf,
  inspectAndFlattenPdfForms,
  comparePdf,
  aiSummarizePdf,
  extractTextFromPdf,
  auditPdfTextLayer,
  createSearchablePdf,
  extractOcrLayer,
  translatePdfLayout,
} from "../src/lib/pdf-tools/suite.ts";
import { mergePdfFiles } from "../src/lib/pdf-tools/merge-pdf.ts";
import {
  createSamplePdfFile,
  createSampleWordFile,
  createSampleExcelFile,
  createSampleProtectedPdfFile,
  createSampleHtmlFile,
  createSampleImageFile,
} from "../src/lib/pdf-tools/sample-pdf.ts";
import { parsePdf } from "../src/lib/converter/pdf-parser.ts";
import { parseDocx } from "../src/lib/converter/docx-parser.ts";
import { parseXlsx } from "../src/lib/converter/xlsx-parser.ts";
import { estimateTokens } from "../src/lib/converter/tokenizer.ts";
import { chunkMarkdown } from "../src/lib/converter/chunker.ts";

async function runCompleteSuiteTest() {
  console.log("=== COMPREHENSIVE SUITE INTERNAL VALIDATION ===");
  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err);
      failed++;
    }
  }

  // 1. Core Parsers
  let samplePdf;
  let sampleWord;
  let sampleExcel;
  let sampleProtected;
  let sampleHtml;

  await check("Sample PDF Generator (4 pages)", async () => {
    samplePdf = await createSamplePdfFile("Annual_Report.pdf", 4);
    if (!samplePdf || samplePdf.size < 100) throw new Error("Failed generating sample PDF");
  });

  await check("Sample Word Generator (.docx)", async () => {
    sampleWord = await createSampleWordFile("Executive_Memo.docx");
    if (!sampleWord || sampleWord.size < 100) throw new Error("Failed generating sample Word doc");
  });

  await check("Sample Excel Generator (.xlsx)", async () => {
    sampleExcel = await createSampleExcelFile("Q4_Budget.xlsx");
    if (!sampleExcel || sampleExcel.size < 100) throw new Error("Failed generating sample Excel");
  });

  await check("Sample Protected PDF Generator", async () => {
    sampleProtected = await createSampleProtectedPdfFile("Locked.pdf", "secret123");
    if (!sampleProtected || sampleProtected.size < 100) throw new Error("Failed generating protected PDF");
  });

  await check("Sample HTML Generator", async () => {
    sampleHtml = createSampleHtmlFile("Report.html");
    if (!sampleHtml || sampleHtml.size < 50) throw new Error("Failed generating sample HTML");
  });

  // 2. Converters to Markdown
  await check("PDF to Markdown parser (parsePdf)", async () => {
    const buf = await samplePdf.arrayBuffer();
    const res = await parsePdf(buf);
    if (!res.markdown || res.pageCount !== 4) throw new Error("Invalid parsePdf output");
  });

  await check("DOCX to Markdown parser (parseDocx)", async () => {
    const buf = await sampleWord.arrayBuffer();
    const md = await parseDocx(buf);
    if (!md || md.length < 20) throw new Error("Invalid parseDocx output");
  });

  await check("XLSX to Markdown parser (parseXlsx)", async () => {
    const buf = await sampleExcel.arrayBuffer();
    const res = parseXlsx(buf);
    if (!res.markdown || res.sheetNames.length === 0) throw new Error("Invalid parseXlsx output");
  });

  await check("Token Estimator & RAG Chunker", async () => {
    const sampleText = "# Title\n\nThis is a sample document for testing RAG chunking and token counting.\n".repeat(20);
    const tokens = estimateTokens(sampleText);
    if (tokens <= 0) throw new Error("Token estimator returned 0");
    const chunks = chunkMarkdown(sampleText, { chunkSizeTokens: 100, overlapTokens: 20 });
    if (chunks.length < 2) throw new Error("Chunker did not split into expected chunks");
  });

  // 3. Document Extraction & Tools
  await check("Extract text from PDF (extractTextFromPdf)", async () => {
    const res = await extractTextFromPdf(samplePdf);
    if (!res.text || res.pages.length !== 4) throw new Error("Failed extracting text from PDF");
  });

  await check("OCR Text Layer Audit Engine (auditPdfTextLayer)", async () => {
    const res = await auditPdfTextLayer(samplePdf);
    if (!res.summary || res.summary.totalPages !== 4) {
      throw new Error(`Expected 4 pages audited, got ${res.summary?.totalPages}`);
    }
    if (res.summary.totalWords < 50) {
      throw new Error(`Expected >50 words in sample PDF, got ${res.summary.totalWords}`);
    }
    if (res.summary.searchabilityScore < 70) {
      throw new Error(`Expected searchability score >=70%, got ${res.summary.searchabilityScore}%`);
    }
    if (res.pages.length !== 4) {
      throw new Error(`Expected 4 page audits, got ${res.pages.length}`);
    }
    if (!res.markdownReport || !res.fullText) {
      throw new Error("Missing compiled report or full text in audit result");
    }
  });

  await check("Generate Searchable PDF (createSearchablePdf)", async () => {
    const pagesText = [
      "DocDrop OCR Searchable Page 1 Content",
      "DocDrop OCR Searchable Page 2 Content",
      "DocDrop OCR Searchable Page 3 Content",
      "DocDrop OCR Searchable Page 4 Content",
    ];
    const res = await createSearchablePdf(samplePdf, pagesText, { invisible: true });
    if (!res.pdfBytes || res.pdfBytes.length < 1000) {
      throw new Error("Searchable PDF bytes generation failed");
    }
    if (!res.fileName.endsWith("_searchable.pdf")) {
      throw new Error(`Unexpected fileName: ${res.fileName}`);
    }
  });

  await check("Legacy OCR Layer Helper (extractOcrLayer)", async () => {
    const res = await extractOcrLayer(samplePdf);
    if (!res.hasDigitalLayer || res.wordCount < 50 || res.pages.length !== 4) {
      throw new Error("Failed extractOcrLayer backward compatibility check");
    }
  });

  await check("Split PDF (Range & Multi-mode ZIP)", async () => {
    // 1. Classic range
    const resRange = await splitPdf(samplePdf, "1-2");
    if (resRange.pageCount !== 2 || !resRange.pdfBytes || resRange.type !== "pdf") {
      throw new Error("Failed splitPdf range");
    }

    // 2. Extract all pages to individual PDFs (ZIP)
    const resAll = await splitPdf(samplePdf, { mode: "extract_all" });
    if (resAll.splitFilesCount !== 4 || !resAll.zipBlob || resAll.type !== "zip") {
      throw new Error("Failed splitPdf extract_all");
    }

    // 3. Split every 2 pages (ZIP)
    const resEvery = await splitPdf(samplePdf, { mode: "split_every", splitEvery: 2 });
    if (resEvery.splitFilesCount !== 2 || !resEvery.zipBlob || resEvery.type !== "zip") {
      throw new Error("Failed splitPdf split_every");
    }

    // 4. Multi-range split (ZIP)
    const resMulti = await splitPdf(samplePdf, {
      mode: "multi_range",
      multiRanges: [
        { name: "First_Half", from: 1, to: 2 },
        { name: "Second_Half", from: 3, to: 4 },
      ],
    });
    if (resMulti.splitFilesCount !== 2 || !resMulti.zipBlob || resMulti.type !== "zip") {
      throw new Error("Failed splitPdf multi_range");
    }
  });

  await check("Rotate PDF (90 deg)", async () => {
    const res = await rotatePdf(samplePdf, 90);
    if (res.totalPages !== 4 || !res.pdfBytes) throw new Error("Failed rotatePdf");
  });

  await check("Remove Pages (Single, Range, Filter & Safeguards)", async () => {
    // 1. Single page string
    const resSingle = await removePagesFromPdf(samplePdf, "2");
    if (resSingle.remainingPages !== 3 || !resSingle.pdfBytes) throw new Error("Failed removePagesFromPdf single");

    // 2. Range string
    const resRange = await removePagesFromPdf(samplePdf, "2-3");
    if (resRange.remainingPages !== 2 || resRange.removedPagesCount !== 2) throw new Error("Failed removePagesFromPdf range");

    // 3. Array of numbers
    const resArray = await removePagesFromPdf(samplePdf, [1, 4]);
    if (resArray.remainingPages !== 2 || resArray.removedPagesCount !== 2) throw new Error("Failed removePagesFromPdf array");

    // 4. Even pages filter
    const resEven = await removePagesFromPdf(samplePdf, { filter: "even_pages" });
    if (resEven.remainingPages !== 2 || resEven.removedPagesCount !== 2) throw new Error("Failed removePagesFromPdf even filter");

    // 5. Safeguard: cannot remove all pages
    let threw = false;
    try {
      await removePagesFromPdf(samplePdf, "1-4");
    } catch {
      threw = true;
    }
    if (!threw) throw new Error("Failed safeguard: removePagesFromPdf should throw when removing all pages");
  });

  await check("Watermark PDF", async () => {
    const res = await watermarkPdf(samplePdf, "CONFIDENTIAL", 0.2);
    if (res.totalPages !== 4 || !res.pdfBytes) throw new Error("Failed watermarkPdf");

    // Test Advanced Tiled Watermark with Custom Color and Page Scope
    const advancedRes = await watermarkPdf(samplePdf, {
      text: "RESTRICTED",
      color: "red",
      layout: "tiled_repeat",
      rotation: 30,
      opacity: 0.15,
      pageScope: "exclude_first",
    });
    if (advancedRes.pagesWatermarked.length !== 3 || !advancedRes.pdfBytes) {
      throw new Error("Failed advanced tiled watermarkPdf");
    }
  });

  await check("Add Page Numbers", async () => {
    const res = await addPageNumbersToPdf(samplePdf, "bottom-center");
    if (res.totalPages !== 4 || !res.pdfBytes) throw new Error("Failed addPageNumbersToPdf");

    // Test Advanced Page Numbering with Facing Pages, Skip Cover, and Roman Numerals
    const advancedRes = await addPageNumbersToPdf(samplePdf, {
      format: "roman_upper",
      position: "top-right",
      style: "accent_line",
      facingPages: true,
      skipCover: true,
      color: "blue",
    });
    if (advancedRes.pagesNumbered.length !== 3 || !advancedRes.pdfBytes) {
      throw new Error("Failed advanced addPageNumbersToPdf");
    }
  });

  await check("Compress PDF (Recommended, Extreme, Light)", async () => {
    const resRec = await compressPdf(samplePdf, { level: "recommended" });
    if (!resRec.pdfBytes || resRec.compressedSize <= 0) throw new Error("Failed compressPdf recommended");

    const resExt = await compressPdf(samplePdf, { level: "extreme" });
    if (!resExt.pdfBytes || resExt.compressedSize <= 0) throw new Error("Failed compressPdf extreme");

    const resLight = await compressPdf(samplePdf, { level: "light" });
    if (!resLight.pdfBytes || resLight.compressedSize <= 0) throw new Error("Failed compressPdf light");
  });

  await check("Repair PDF (Standard & Corrupt Binary Recovery)", async () => {
    // 1. Standard repair
    const res = await repairPdf(samplePdf);
    if (!res.pdfBytes || res.repairedSize <= 0) throw new Error("Failed repairPdf standard");

    // 2. Intentionally corrupted document: prepend garbage bytes + truncate %%EOF
    const originalBuf = await samplePdf.arrayBuffer();
    const originalBytes = new Uint8Array(originalBuf);
    const garbagePrefix = new TextEncoder().encode("GARBAGE_HTTP_HEADER: 404\r\nBOM_INVALID_DATA\r\n");
    // Strip trailing %%EOF
    const truncatedOriginal = originalBytes.slice(0, Math.max(10, originalBytes.length - 12));

    const corruptedBytes = new Uint8Array(garbagePrefix.length + truncatedOriginal.length);
    corruptedBytes.set(garbagePrefix, 0);
    corruptedBytes.set(truncatedOriginal, garbagePrefix.length);

    const corruptFile = new File([corruptedBytes], "Corrupted_Broken_Doc.pdf", { type: "application/pdf" });
    const resCorrupt = await repairPdf(corruptFile);

    if (!resCorrupt.pdfBytes || resCorrupt.repairedSize <= 0 || resCorrupt.totalPages < 1) {
      throw new Error("Failed repairPdf on corrupt binary test document");
    }
    if (resCorrupt.issuesRepaired < 1) {
      throw new Error("Expected at least 1 repaired issue reported on corrupt document");
    }
  });

  await check("Crop PDF", async () => {
    const res = await cropPdf(samplePdf, 36);
    if (res.totalPages !== 4 || !res.pdfBytes) throw new Error("Failed cropPdf");
  });

  await check("Protect PDF (Encrypt with password)", async () => {
    const res = await protectPdf(samplePdf, "mypassword123");
    if (!res.pdfBytes || res.pdfBytes.length < 100) throw new Error("Failed protectPdf");
  });

  await check("Unlock PDF (Decrypt with password)", async () => {
    const res = await unlockPdf(sampleProtected, "secret123");
    if (!res.pdfBytes || res.pdfBytes.length < 100) throw new Error("Failed unlockPdf");
  });

  await check("Sign PDF (Digital Signature & Certified Audit Stamp)", async () => {
    // 1. Legacy call
    const res = await signPdf(samplePdf, "Antigravity Engineer");
    if (res.totalPages !== 4 || !res.pdfBytes) throw new Error("Failed signPdf legacy");

    // 2. Advanced call with executive certificate badge & SHA-256 integrity digest
    const resAdv = await signPdf(samplePdf, {
      signerName: "Chief Legal Officer",
      signerTitle: "General Counsel & VP Operations",
      signerReason: "Contract Executed & Formally Approved",
      position: "bottom-right",
      pageScope: "last_page",
      inkColor: "blue",
      includeVerificationBadge: true,
    });
    if (!resAdv.pdfBytes || resAdv.pagesSigned.length !== 1 || resAdv.pagesSigned[0] !== 4) {
      throw new Error("Failed signPdf advanced last_page placement");
    }
    if (!resAdv.sha256Digest || resAdv.sha256Digest.length < 32 || !resAdv.auditId) {
      throw new Error("Failed signPdf cryptographic audit trail");
    }

    // 3. Interactive custom placements (signature + initials + date across arbitrary coordinates & pages)
    const resCustom = await signPdf(samplePdf, {
      signerName: "Yaswanth Kurmasala",
      stampStyle: "pure",
      inkColor: "crimson",
      customPlacements: [
        { id: "p1_init", pageNumber: 1, xPercent: 10, yPercent: 85, widthPercent: 12, heightPercent: 6, kind: "initials" },
        { id: "p4_sig", pageNumber: 4, xPercent: 52.5, yPercent: 72.3, widthPercent: 28, heightPercent: 10, kind: "signature" },
        { id: "p4_date", pageNumber: 4, xPercent: 52.5, yPercent: 84, widthPercent: 18, heightPercent: 6, kind: "date" },
      ],
    });
    if (!resCustom.pdfBytes || resCustom.pagesSigned.length !== 2 || resCustom.pagesSigned[0] !== 1 || resCustom.pagesSigned[1] !== 4) {
      throw new Error("Failed signPdf custom multi-page drag placements");
    }
  });

  await check("Redact PDF (Blackout sensitive area)", async () => {
    // 1. Legacy call signature
    const res = await redactPdf(samplePdf, 1);
    if (!res.pdfBytes || res.redactedCount < 1) throw new Error("Failed legacy redactPdf");

    // 2. Advanced PII and keyword redaction with audit manifest
    const advRes = await redactPdf(samplePdf, {
      searchTerm: "Document",
      targetMode: "keyword",
      fillColor: "black",
      labelStyle: "redacted",
      pageScope: "all",
    });
    if (!advRes.pdfBytes || advRes.redactedCount < 1 || !advRes.sha256Digest || !advRes.auditId) {
      throw new Error("Failed advanced redactPdf with audit manifest");
    }
  });

  await check("Compare two PDFs", async () => {
    const p1 = await createSamplePdfFile("DocA.pdf", 2);
    const p2 = await createSamplePdfFile("DocB.pdf", 2);
    const res = await comparePdf(p1, p2);
    if (typeof res.similarityScore !== "number" || !res.reportText) throw new Error("Failed comparePdf");
  });

  await check("AI Summarizer (in-browser summary)", async () => {
    const res = await aiSummarizePdf(samplePdf);
    if (!res.summary || res.totalPages !== 4 || res.tokenCount <= 0) throw new Error("Failed aiSummarizePdf");
  });

  await check("Translate PDF Layout (Bilingual Dual-Column & Markdown)", async () => {
    const res = await translatePdfLayout(samplePdf, {
      targetLanguage: "Spanish",
      layoutMode: "side_by_side",
      includeBilingualPdf: true,
    });
    if (!res.markdownContent || res.segments.length < 1 || res.totalPages !== 4) {
      throw new Error("Failed translatePdfLayout side-by-side segmentation");
    }
    if (!res.pdfBytes || res.pdfBytes.length < 500) {
      throw new Error("Failed translatePdfLayout bilingual PDF generation");
    }
    if (!res.htmlViewerContent.includes("DocDrop Bilingual Layout Viewer")) {
      throw new Error("Failed translatePdfLayout HTML viewer generation");
    }
  });

  await check("PDF to Word (.docx) - Advanced Engine", async () => {
    // 1. Flowing mode
    const resFlowing = await convertPdfToWord(samplePdf, {
      layoutMode: "flowing",
      styleTheme: "modern",
      includePageNumbers: true,
      detectTables: true,
    });
    if (!resFlowing.docxBlob || resFlowing.totalPages !== 4) {
      throw new Error("Failed convertPdfToWord flowing");
    }
    if (resFlowing.totalWords < 50) {
      throw new Error(`Expected >50 words in converted docx, got ${resFlowing.totalWords}`);
    }
    if (resFlowing.headingsCount < 1) {
      throw new Error("Expected at least 1 heading detected in sample PDF");
    }

    // 2. Page preserved mode
    const resPreserved = await convertPdfToWord(samplePdf, {
      layoutMode: "page_preserved",
      styleTheme: "classic",
      includePageNumbers: true,
    });
    if (!resPreserved.docxBlob || resPreserved.totalPages !== 4) {
      throw new Error("Failed convertPdfToWord page_preserved");
    }
  });

  await check("PDF to Excel (.xlsx)", async () => {
    const res = await convertPdfToExcel(samplePdf);
    if (!res.excelBuffer || res.totalRows <= 0) throw new Error("Failed convertPdfToExcel");
  });

  await check("PDF to PDF/A", async () => {
    const res = await convertPdfToPdfA(samplePdf);
    if (!res.pdfBytes || res.totalPages !== 4) throw new Error("Failed convertPdfToPdfA");
  });

  await check("Word to PDF", async () => {
    const res = await convertWordToPdf(sampleWord);
    if (!res.pdfBytes || res.totalPages < 1) throw new Error("Failed convertWordToPdf");
  });

  await check("Excel to PDF", async () => {
    const res = await convertExcelToPdf(sampleExcel);
    if (!res.pdfBytes || res.totalPages < 1) throw new Error("Failed convertExcelToPdf");
  });

  await check("HTML to PDF", async () => {
    const res = await convertHtmlToPdf(sampleHtml);
    if (!res.pdfBytes || res.totalPages < 1) throw new Error("Failed convertHtmlToPdf");
  });

  await check("Images to PDF (JPG/PNG & Scan to PDF)", async () => {
    const img1 = await createSampleImageFile("Scan_Page_1.png");
    const img2 = await createSampleImageFile("Scan_Page_2.png");
    const res = await convertImagesToPdf([img1, img2], {
      pageSize: "a4",
      orientation: "portrait",
      margin: "small",
    });
    if (!res.pdfBytes || res.totalPages !== 2) throw new Error("Failed convertImagesToPdf");
  });

  await check("Merge multiple PDFs", async () => {
    const p1 = await createSamplePdfFile("Merge1.pdf", 2);
    const p2 = await createSamplePdfFile("Merge2.pdf", 3);
    const res = await mergePdfFiles([p1, p2]);
    if (res.totalPages !== 5 || !res.mergedBytes) throw new Error("Failed mergePdfFiles");
  });

  await check("Organize PDF Pages (Reverse & Custom)", async () => {
    const res = await organizePdfPages(samplePdf, "reverse");
    if (res.pageCount !== 4 || !res.pdfBytes) throw new Error("Failed organizePdfPages reverse");
    const resCustom = await organizePdfPages(samplePdf, "3, 1, 2");
    if (resCustom.pageCount !== 3 || !resCustom.pdfBytes) throw new Error("Failed organizePdfPages custom");
  });

  await check("Annotate / Edit PDF (Certified Callout Badge)", async () => {
    const res = await annotatePdf(samplePdf, {
      text: "APPROVED FOR PRODUCTION",
      position: "top-right",
      tone: "approved",
    });
    if (res.totalPages !== 4 || !res.pdfBytes) throw new Error("Failed annotatePdf");

    // Test Advanced Rubber Stamp with double-border and multi-page scope
    const advancedRes = await annotatePdf(samplePdf, {
      text: "CONFIDENTIAL",
      subtitle: "RESTRICTED ACCESS • DO NOT COPY",
      style: "rubber_stamp",
      tone: "confidential",
      pageScope: "all",
      position: "center",
      rotation: -12,
    });
    if (advancedRes.stampsApplied !== 4 || advancedRes.pagesAnnotated.length !== 4) {
      throw new Error(`Failed advanced multi-page annotatePdf: ${advancedRes.summary}`);
    }
  });

  await check("Inspect & Flatten PDF Forms", async () => {
    const res = await inspectAndFlattenPdfForms(samplePdf);
    if (res.totalPages !== 4 || !res.pdfBytes) throw new Error("Failed inspectAndFlattenPdfForms");
  });

  console.log(`\n=== SUITE RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runCompleteSuiteTest().catch((e) => {
  console.error("FATAL SUITE ERROR:", e);
  process.exit(1);
});
