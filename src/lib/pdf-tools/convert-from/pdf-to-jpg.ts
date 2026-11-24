import { loadPdfJs } from "../common/pdfjs-loader.ts";

/**
 * Convert PDF pages to JPG images and package into a ZIP archive
 */
export async function convertPdfToJpg(file: File): Promise<{
  zipBlob: Blob;
  images: { pageNum: number; dataUrl: string }[];
  fileName: string;
  totalPages: number;
}> {
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
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await (page.render({ canvasContext: ctx as any, viewport } as any) as any).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      images.push({ pageNum: i, dataUrl });

      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      zip.file(`${baseName}_page_${i}.jpg`, base64Data, { base64: true });
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return {
    zipBlob,
    images,
    fileName: `${baseName}_jpg_images.zip`,
    totalPages: total,
  };
}
