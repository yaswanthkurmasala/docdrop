/**
 * Loads pdfjs-dist dynamically in the browser or Node.js environment
 */
export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjs;
}

/**
 * Extracts plain text and per-page texts from PDF in memory
 */
export async function extractTextFromPdf(file: File): Promise<{ text: string; pages: string[] }> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  let fullText = "";

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageStr = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageStr);
    fullText += `\n--- Page ${i} ---\n` + pageStr;
  }

  return { text: fullText.trim(), pages };
}
