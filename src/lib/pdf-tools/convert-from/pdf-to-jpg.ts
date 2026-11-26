import { loadPdfJs } from "../common/pdfjs-loader.ts";

export interface PdfToJpgOptions {
  scale?: number; // 1.0, 1.5, 2.0
  format?: "jpeg" | "png";
  quality?: number;
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Convert PDF pages to JPG/PNG images and package into a ZIP archive
 */
export async function convertPdfToJpg(
  file: File,
  options?: PdfToJpgOptions
): Promise<{
  zipBlob: Blob;
  images: { pageNum: number; dataUrl: string }[];
  fileName: string;
  totalPages: number;
}> {
  const scale = options?.scale || 1.5;
  const format = options?.format || "jpeg";
  const quality = options?.quality || 0.92;
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const ext = format === "png" ? "png" : "jpg";

  options?.onProgress?.(10, "Initializing PDF rendering canvas...");
  const pdfjs = await loadPdfJs();
  const jszipModule = await import("jszip");
  const JSZip = (jszipModule as any).default || jszipModule;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const total = doc.numPages;
  const zip = new JSZip();
  const images: { pageNum: number; dataUrl: string }[] = [];
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  for (let i = 1; i <= total; i++) {
    const percent = Math.min(95, Math.round((i / total) * 85) + 10);
    options?.onProgress?.(percent, `Rendering page ${i} of ${total} (${scale === 2.0 ? "300 DPI Ultra" : scale === 1.5 ? "150 DPI Crisp" : "96 DPI Standard"})...`);

    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await (page.render({ canvasContext: ctx as any, viewport } as any) as any).promise;
      const dataUrl = canvas.toDataURL(mimeType, quality);
      images.push({ pageNum: i, dataUrl });

      const base64Data = dataUrl.replace(new RegExp(`^data:${mimeType};base64,`), "");
      zip.file(`${baseName}_page_${i}.${ext}`, base64Data, { base64: true });
    }
  }

  options?.onProgress?.(95, "Packaging high-resolution images into ZIP archive...");
  const zipBlob = await zip.generateAsync({ type: "blob" });
  options?.onProgress?.(100, "Done!");

  return {
    zipBlob,
    images,
    fileName: `${baseName}_${ext}_images.zip`,
    totalPages: total,
  };
}
