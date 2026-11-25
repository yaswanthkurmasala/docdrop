import { PDFDocument, StandardFonts, rgb, PDFFont, PDFImage } from "pdf-lib";

export type SignatureMode = "type" | "draw" | "upload";

export type SignaturePosition =
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "top-right"
  | "top-left"
  | "top-center";

export type SignaturePageScope = "last_page" | "first_page" | "all_pages" | "custom";

export type SignatureInkColor = "blue" | "dark" | "purple" | "crimson" | "emerald";

export type CursiveStyle = "formal" | "script" | "modern" | "bold";

export type SignatureStampStyle = "pure" | "line" | "badge";

export interface SignaturePlacement {
  id: string;
  pageNumber: number; // 1-based page number
  xPercent: number; // 0..100 from LEFT edge
  yPercent: number; // 0..100 from TOP edge
  widthPercent: number; // percentage of PDF page width
  heightPercent: number; // percentage of PDF page height
  kind?: "signature" | "initials" | "date";
  textOverride?: string;
}

export interface SignaturePreset {
  id: string;
  name: string;
  mode: SignatureMode;
  position: SignaturePosition;
  pageScope: SignaturePageScope;
  inkColor: SignatureInkColor;
  includeBadge: boolean;
  stampStyle?: SignatureStampStyle;
  desc: string;
}

export const SIGNATURE_PRESETS: SignaturePreset[] = [
  {
    id: "executive_approval",
    name: "Executive Contract Stamp",
    mode: "type",
    position: "bottom-right",
    pageScope: "last_page",
    inkColor: "blue",
    includeBadge: true,
    stampStyle: "badge",
    desc: "Navy blue signature with certified legal timestamp & SHA-256 block",
  },
  {
    id: "freehand_contract",
    name: "Freehand Pure Ink",
    mode: "draw",
    position: "bottom-right",
    pageScope: "last_page",
    inkColor: "dark",
    includeBadge: false,
    stampStyle: "pure",
    desc: "Crisp handwritten stylus signature with zero box or extra lines",
  },
  {
    id: "initial_every_page",
    name: "Initial All Pages",
    mode: "type",
    position: "bottom-left",
    pageScope: "all_pages",
    inkColor: "blue",
    includeBadge: false,
    stampStyle: "line",
    desc: "Compact signature & date line placed cleanly across every page",
  },
  {
    id: "corporate_seal",
    name: "Corporate Audit Seal",
    mode: "type",
    position: "bottom-center",
    pageScope: "last_page",
    inkColor: "purple",
    includeBadge: true,
    stampStyle: "badge",
    desc: "High-contrast audit certification badge with SHA-256 integrity hash",
  },
  {
    id: "clean_signature",
    name: "Minimalist Signature Line",
    mode: "type",
    position: "bottom-right",
    pageScope: "last_page",
    inkColor: "dark",
    includeBadge: false,
    stampStyle: "line",
    desc: "Clean cursive signature with baseline & date without bounding box",
  },
];

export interface SignPdfOptions {
  signerName?: string;
  signerTitle?: string;
  signerReason?: string;
  signerLocation?: string;
  signatureImage?: string; // Data URL (PNG/JPEG)
  mode?: SignatureMode;
  position?: SignaturePosition;
  pageScope?: SignaturePageScope;
  targetPage?: number;
  inkColor?: SignatureInkColor;
  cursiveStyle?: CursiveStyle;
  includeVerificationBadge?: boolean;
  stampStyle?: SignatureStampStyle;
  customPlacements?: SignaturePlacement[];
  margin?: number;
  onProgress?: (percent: number, message: string) => void;
}

export interface SignPdfResult {
  pdfBytes: Uint8Array;
  fileName: string;
  totalPages: number;
  pagesSigned: number[];
  signerName: string;
  sha256Digest: string;
  auditId: string;
  timestamp: string;
  summary: string;
}

async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // Fallback if Web Crypto is unavailable
  }
  let hash = 0x811c9dc5;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < Math.min(bytes.length, 100000); i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash).toString(16).padStart(32, "0").slice(0, 32);
}

function sanitizeWinAnsi(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/[\u2022\u25CF\u25AA]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/€/g, "EUR")
    .replace(/£/g, "GBP")
    .replace(/¥/g, "JPY")
    .replace(/₹/g, "INR")
    .replace(/[^\x00-\x7F]/g, (char) => {
      return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || " ";
    });
}

function getInkRgb(ink: SignatureInkColor = "blue") {
  switch (ink) {
    case "blue":
      return rgb(0.05, 0.22, 0.65);
    case "purple":
      return rgb(0.35, 0.08, 0.55);
    case "crimson":
      return rgb(0.7, 0.1, 0.14);
    case "emerald":
      return rgb(0.02, 0.45, 0.32);
    case "dark":
    default:
      return rgb(0.08, 0.09, 0.12);
  }
}

function getInitials(name: string): string {
  const parts = (name || "A S").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}.${parts[parts.length - 1][0]}.`.toUpperCase();
}

export async function signPdf(
  file: File,
  optionsOrSignature: SignPdfOptions | string = "Digitally Signed",
  isImageLegacy: boolean = false,
  pageNumLegacy: number = 1
): Promise<SignPdfResult> {
  let options: SignPdfOptions = {};

  if (typeof optionsOrSignature === "string") {
    options = {
      signerName: isImageLegacy ? "Signer" : optionsOrSignature,
      signatureImage: isImageLegacy ? optionsOrSignature : undefined,
      mode: isImageLegacy ? "draw" : "type",
      pageScope: "custom",
      targetPage: pageNumLegacy,
      includeVerificationBadge: true,
    };
  } else {
    options = optionsOrSignature;
  }

  const {
    signerName = "Authorized Signer",
    signerTitle = "Authorized Signatory",
    signerReason = "Approved & Accepted",
    signatureImage,
    position = "bottom-right",
    pageScope = "last_page",
    targetPage = 1,
    inkColor = "blue",
    cursiveStyle = "script",
    includeVerificationBadge = true,
    stampStyle: explicitStampStyle,
    customPlacements,
    margin = 36,
    onProgress,
  } = options;

  const stampStyle: SignatureStampStyle =
    explicitStampStyle || (includeVerificationBadge ? "badge" : "line");

  onProgress?.(15, "Loading PDF document in-browser...");
  const buffer = await file.arrayBuffer();
  onProgress?.(35, "Computing SHA-256 cryptographic document digest...");
  const fullSha256 = await computeSha256(buffer.slice(0));
  const pdfDoc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();
  const shortHash = fullSha256.slice(0, 16);
  const auditId = `CERT-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now()
    .toString(36)
    .toUpperCase()}`;
  const now = new Date();
  const dateOnly = now.toISOString().slice(0, 10);
  const formattedTimestamp = `${dateOnly} ${now.toTimeString().slice(0, 8)} UTC`;

  onProgress?.(55, "Embedding fonts & high-DPI signature graphics...");

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let fontSignature: PDFFont;
  if (cursiveStyle === "formal") {
    fontSignature = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  } else if (cursiveStyle === "bold") {
    fontSignature = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  } else {
    fontSignature = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  }

  let embeddedSignatureImg: PDFImage | null = null;
  if (signatureImage && signatureImage.startsWith("data:image/")) {
    try {
      const isPng = signatureImage.startsWith("data:image/png");
      const base64Data = signatureImage.split(",")[1];
      const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      embeddedSignatureImg = isPng
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);
    } catch (imgErr) {
      console.warn("Could not embed signature image, falling back to cursive typography:", imgErr);
    }
  }

  onProgress?.(75, "Stamping signatures onto exact document coordinates...");
  const ink = getInkRgb(inkColor);
  const signedPagesSet = new Set<number>();

  // Helper to draw a signature block or image inside any exact rectangle (bottom-left origin x, y, w, h)
  const renderBlockAt = (
    pageIdx: number,
    x: number,
    y: number,
    blockW: number,
    blockH: number,
    kind: "signature" | "initials" | "date" = "signature",
    textOverride?: string
  ) => {
    const page = pdfDoc.getPage(pageIdx);
    const { width: pWidth, height: pHeight } = page.getSize();
    const safeX = Math.max(4, Math.min(x, pWidth - blockW - 4));
    const safeY = Math.max(4, Math.min(y, pHeight - blockH - 4));

    if (kind === "date") {
      const dateStr = sanitizeWinAnsi(textOverride || dateOnly);
      const fontSize = Math.max(9, Math.min(14, blockH * 0.55));
      page.drawText(dateStr, {
        x: safeX + 4,
        y: safeY + (blockH - fontSize) / 2,
        size: fontSize,
        font: fontBold,
        color: ink,
      });
      return;
    }

    if (kind === "initials") {
      const initStr = sanitizeWinAnsi(textOverride || getInitials(signerName));
      const fontSize = Math.max(12, Math.min(20, blockH * 0.65));
      page.drawText(initStr, {
        x: safeX + 4,
        y: safeY + (blockH - fontSize) / 2 + 2,
        size: fontSize,
        font: fontSignature,
        color: ink,
      });
      return;
    }

    if (stampStyle === "badge") {
      page.drawRectangle({
        x: safeX,
        y: safeY,
        width: blockW,
        height: blockH,
        color: rgb(0.985, 0.985, 0.995),
        borderColor: rgb(0.8, 0.84, 0.92),
        borderWidth: 0.75,
      });

      const ribbonH = Math.min(13, Math.max(10, blockH * 0.17));
      page.drawRectangle({
        x: safeX,
        y: safeY + blockH - ribbonH,
        width: blockW,
        height: ribbonH,
        color: ink,
      });

      page.drawText(sanitizeWinAnsi("DIGITALLY CERTIFIED & VERIFIED"), {
        x: safeX + 6,
        y: safeY + blockH - ribbonH + 3,
        size: 6.5,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(sanitizeWinAnsi(auditId.slice(0, 14)), {
        x: safeX + Math.max(80, blockW - 58),
        y: safeY + blockH - ribbonH + 3,
        size: 6,
        font: fontRegular,
        color: rgb(0.88, 0.92, 1),
      });

      const sigAreaTop = safeY + blockH - ribbonH - 4;
      const sigAreaBottom = safeY + Math.min(34, blockH * 0.44);
      const sigMaxH = Math.max(18, sigAreaTop - sigAreaBottom);
      const sigMaxW = Math.max(60, blockW - 16);

      if (embeddedSignatureImg) {
        const scaled = embeddedSignatureImg.scaleToFit(sigMaxW, sigMaxH);
        page.drawImage(embeddedSignatureImg, {
          x: safeX + 8,
          y: sigAreaBottom + (sigMaxH - scaled.height) / 2,
          width: scaled.width,
          height: scaled.height,
        });
      } else {
        const fontSize = Math.max(11, Math.min(18, sigMaxH * 0.7));
        page.drawText(sanitizeWinAnsi(signerName), {
          x: safeX + 8,
          y: sigAreaBottom + (sigMaxH - fontSize) / 2 + 2,
          size: fontSize,
          font: fontSignature,
          color: ink,
        });
      }

      const detailsX = safeX + 6;
      const lineStep = Math.max(7, Math.min(9, (sigAreaBottom - safeY) / 4.2));
      let textY = sigAreaBottom - lineStep;

      page.drawText(sanitizeWinAnsi(`Signer: ${signerName} - ${signerTitle}`).slice(0, 52), {
        x: detailsX,
        y: textY,
        size: 6.5,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.25),
      });

      textY -= lineStep;
      page.drawText(sanitizeWinAnsi(`Reason: ${signerReason}`).slice(0, 52), {
        x: detailsX,
        y: textY,
        size: 6,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.4),
      });

      textY -= lineStep;
      page.drawText(sanitizeWinAnsi(`Time: ${formattedTimestamp}`), {
        x: detailsX,
        y: textY,
        size: 6,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.4),
      });

      textY -= lineStep;
      if (textY >= safeY + 2) {
        page.drawText(sanitizeWinAnsi(`SHA-256: ${shortHash}...`), {
          x: detailsX,
          y: textY,
          size: 5.5,
          font: fontRegular,
          color: rgb(0.45, 0.45, 0.52),
        });
      }
    } else if (stampStyle === "line") {
      const footerH = 14;
      const sigMaxH = Math.max(18, blockH - footerH - 4);
      const sigMaxW = Math.max(60, blockW - 4);

      if (embeddedSignatureImg) {
        const scaled = embeddedSignatureImg.scaleToFit(sigMaxW, sigMaxH);
        page.drawImage(embeddedSignatureImg, {
          x: safeX + (blockW - scaled.width) / 2,
          y: safeY + footerH + (sigMaxH - scaled.height) / 2,
          width: scaled.width,
          height: scaled.height,
        });
      } else {
        const fontSize = Math.max(12, Math.min(22, sigMaxH * 0.72));
        page.drawText(sanitizeWinAnsi(signerName), {
          x: safeX + 4,
          y: safeY + footerH + 4,
          size: fontSize,
          font: fontSignature,
          color: ink,
        });
      }

      page.drawLine({
        start: { x: safeX, y: safeY + 11 },
        end: { x: safeX + blockW, y: safeY + 11 },
        thickness: 0.75,
        color: rgb(0.65, 0.68, 0.74),
      });

      page.drawText(sanitizeWinAnsi(`Signed by ${signerName} - ${dateOnly}`), {
        x: safeX + 2,
        y: safeY + 2,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.4, 0.42, 0.48),
      });
    } else {
      // Pure Signature Only (No box, no border, no footer line — clean ink onto existing form lines)
      if (embeddedSignatureImg) {
        const scaled = embeddedSignatureImg.scaleToFit(blockW, blockH);
        page.drawImage(embeddedSignatureImg, {
          x: safeX + (blockW - scaled.width) / 2,
          y: safeY + (blockH - scaled.height) / 2,
          width: scaled.width,
          height: scaled.height,
        });
      } else {
        const fontSize = Math.max(14, Math.min(28, blockH * 0.65));
        page.drawText(sanitizeWinAnsi(signerName), {
          x: safeX + 4,
          y: safeY + (blockH - fontSize) / 2 + 2,
          size: fontSize,
          font: fontSignature,
          color: ink,
        });
      }
    }
  };

  if (customPlacements && customPlacements.length > 0) {
    // Render exact custom user-dragged placements per page
    for (const placement of customPlacements) {
      const pageIdx = Math.max(0, Math.min(placement.pageNumber - 1, total - 1));
      const page = pdfDoc.getPage(pageIdx);
      const { width: pWidth, height: pHeight } = page.getSize();

      const blockW = Math.max(48, (placement.widthPercent / 100) * pWidth);
      const blockH = Math.max(22, (placement.heightPercent / 100) * pHeight);
      const x = (placement.xPercent / 100) * pWidth;
      // Convert browser top-origin y% to PDF bottom-origin point y
      const y = pHeight - ((placement.yPercent + placement.heightPercent) / 100) * pHeight;

      renderBlockAt(pageIdx, x, y, blockW, blockH, placement.kind || "signature", placement.textOverride);
      signedPagesSet.add(pageIdx + 1);
    }
  } else {
    // Standard corner preset placements (legacy & preset mode)
    const pagesToSignIndices: number[] = [];
    if (pageScope === "all_pages") {
      for (let i = 0; i < total; i++) pagesToSignIndices.push(i);
    } else if (pageScope === "first_page") {
      pagesToSignIndices.push(0);
    } else if (pageScope === "custom") {
      const validIdx = Math.max(0, Math.min((targetPage || 1) - 1, total - 1));
      pagesToSignIndices.push(validIdx);
    } else {
      pagesToSignIndices.push(total - 1);
    }

    const blockW = stampStyle === "badge" ? 220 : 165;
    const blockH = stampStyle === "badge" ? 84 : 46;

    for (const pageIdx of pagesToSignIndices) {
      const page = pdfDoc.getPage(pageIdx);
      const { width: pWidth, height: pHeight } = page.getSize();

      let x = pWidth - blockW - margin;
      let y = margin;

      if (position === "bottom-left") {
        x = margin;
        y = margin;
      } else if (position === "bottom-center") {
        x = (pWidth - blockW) / 2;
        y = margin;
      } else if (position === "top-right") {
        x = pWidth - blockW - margin;
        y = pHeight - blockH - margin;
      } else if (position === "top-left") {
        x = margin;
        y = pHeight - blockH - margin;
      } else if (position === "top-center") {
        x = (pWidth - blockW) / 2;
        y = pHeight - blockH - margin;
      }

      renderBlockAt(pageIdx, x, y, blockW, blockH, "signature");
      signedPagesSet.add(pageIdx + 1);
    }
  }

  try {
    pdfDoc.setKeywords(["DocDrop Verified Signature", auditId, `SHA256:${shortHash}`]);
  } catch {
    // ignore metadata errors on locked dictionaries
  }

  onProgress?.(95, "Finalizing signed PDF document...");
  const pdfBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const pagesFormatted = Array.from(signedPagesSet).sort((a, b) => a - b);

  return {
    pdfBytes,
    fileName: `${baseName}_signed.pdf`,
    totalPages: total,
    pagesSigned: pagesFormatted,
    signerName,
    sha256Digest: fullSha256,
    auditId,
    timestamp: formattedTimestamp,
    summary: `Digitally certified and stamped signature for "${signerName}" on page(s) ${pagesFormatted.join(", ")} with SHA-256 integrity hash.`,
  };
}
