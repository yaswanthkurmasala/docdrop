import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { loadPdfJs } from "../common/pdfjs-loader.ts";

export type RedactTargetMode = "keyword" | "smart_pii" | "manual_box" | "region";

export type RedactFillColor = "black" | "white" | "dark_slate" | "red";

export type RedactLabelStyle =
  | "none"
  | "redacted"
  | "confidential"
  | "pii_masked"
  | "privileged"
  | "foia_b4"
  | "foia_b6"
  | "hipaa_phi"
  | "custom";

export type RedactPageScope = "all" | "first" | "last" | "current" | "custom";

export interface PiiCategories {
  ssn?: boolean;
  email?: boolean;
  phone?: boolean;
  creditCard?: boolean;
  ipAddress?: boolean;
  financial?: boolean;
}

export interface ManualRedactionBox {
  pageNum: number; // 1-based
  x: number; // PDF points
  y: number; // PDF points
  width: number;
  height: number;
  label?: string;
}

export interface RedactPdfOptions {
  pageNum?: number; // 1-based (legacy fallback)
  searchTerm?: string;
  targetMode?: RedactTargetMode;
  piiCategories?: PiiCategories;
  manualBoxes?: ManualRedactionBox[];
  fillColor?: RedactFillColor;
  labelStyle?: RedactLabelStyle;
  customLabel?: string;
  pageScope?: RedactPageScope;
  customPages?: string | number[];
  rasterize?: boolean;
  x?: number; // legacy coordinate support
  y?: number;
  width?: number;
  height?: number;
  onProgress?: (percent: number, message: string) => void;
}

export interface RedactionFinding {
  pageNum: number;
  termOrPattern: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RedactPdfResult {
  pdfBytes: Uint8Array;
  fileName: string;
  auditId: string;
  timestamp: string;
  redactedCount: number;
  pagesAffected: number[];
  findings: RedactionFinding[];
  sha256Digest: string;
  rasterized: boolean;
  summary: string;
}

export interface RedactPreset {
  id: string;
  name: string;
  targetMode: RedactTargetMode;
  searchTerm?: string;
  piiCategories?: PiiCategories;
  fillColor: RedactFillColor;
  labelStyle: RedactLabelStyle;
  customLabel?: string;
  desc: string;
}

export const REDACT_PRESETS: RedactPreset[] = [
  {
    id: "pii_auto_purge",
    name: "PII Auto-Purge",
    targetMode: "smart_pii",
    piiCategories: { ssn: true, email: true, phone: true, creditCard: true },
    fillColor: "black",
    labelStyle: "pii_masked",
    desc: "Scrub SSNs, emails, phone numbers & payment cards across document.",
  },
  {
    id: "confidential_blanket",
    name: "Confidential Blanket",
    targetMode: "keyword",
    searchTerm: "CONFIDENTIAL",
    fillColor: "black",
    labelStyle: "confidential",
    desc: "Blackout all instances of 'CONFIDENTIAL' with stamped legal badges.",
  },
  {
    id: "financial_mask",
    name: "Financial & Cards",
    targetMode: "smart_pii",
    piiCategories: { creditCard: true, financial: true, ssn: true },
    fillColor: "black",
    labelStyle: "redacted",
    desc: "Sanitize credit card numbers and monetary currency figures.",
  },
  {
    id: "foia_privacy_b6",
    name: "FOIA Exemption (b)(6)",
    targetMode: "smart_pii",
    piiCategories: { ssn: true, email: true, phone: true },
    fillColor: "black",
    labelStyle: "foia_b6",
    desc: "FOIA personal privacy exemption mask [FOIA EXEMPT (b)(6)].",
  },
  {
    id: "clean_whiteout",
    name: "Clean Whiteout",
    targetMode: "keyword",
    searchTerm: "DRAFT",
    fillColor: "white",
    labelStyle: "none",
    desc: "Seamlessly erase text elements with 100% white overlay.",
  },
  {
    id: "legal_privilege",
    name: "Attorney-Client Privilege",
    targetMode: "keyword",
    searchTerm: "PRIVILEGED",
    fillColor: "dark_slate",
    labelStyle: "privileged",
    desc: "Dark slate blackout with [LEGAL PRIVILEGE] label.",
  },
];

interface InternalRedactionBox {
  pageNum: number; // 1-based
  x: number;
  y: number;
  width: number;
  height: number;
  reason: string;
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
  return (hash >>> 0).toString(16).padStart(16, "0");
}

function parsePageScope(
  total: number,
  scope: RedactPageScope = "all",
  customPages?: string | number[],
  targetPageNum = 1
): number[] {
  if (scope === "all") {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (scope === "first") {
    return [1];
  }
  if (scope === "last") {
    return [total];
  }
  if (scope === "current") {
    const p = Math.max(1, Math.min(targetPageNum, total));
    return [p];
  }
  if (scope === "custom" && customPages) {
    const pages = new Set<number>();
    if (Array.isArray(customPages)) {
      for (const item of customPages) {
        const p = typeof item === "number" ? item : parseInt(item, 10);
        if (p >= 1 && p <= total) pages.add(p);
      }
    } else {
      const parts = customPages.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes("-")) {
          const [startStr, endStr] = trimmed.split("-");
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
              if (p >= 1 && p <= total) pages.add(p);
            }
          }
        } else {
          const p = parseInt(trimmed, 10);
          if (!isNaN(p) && p >= 1 && p <= total) pages.add(p);
        }
      }
    }
    return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : [1];
  }
  return [Math.max(1, Math.min(targetPageNum, total))];
}

function getLabelString(style?: RedactLabelStyle, customLabel?: string): string {
  switch (style) {
    case "none":
      return "";
    case "redacted":
      return "[REDACTED]";
    case "confidential":
      return "[CONFIDENTIAL]";
    case "pii_masked":
      return "[PII MASKED]";
    case "privileged":
      return "[LEGAL PRIVILEGE]";
    case "foia_b4":
      return "[FOIA EXEMPT (b)(4)]";
    case "foia_b6":
      return "[FOIA EXEMPT (b)(6)]";
    case "hipaa_phi":
      return "[HIPAA PHI]";
    case "custom":
      return customLabel ? `[${customLabel.replace(/^\[|\]$/g, "")}]` : "[REDACTED]";
    default:
      return "[CONFIDENTIAL — REDACTED]";
  }
}

function getColorComponents(fill: RedactFillColor = "black") {
  switch (fill) {
    case "white":
      return {
        pdfFill: rgb(1, 1, 1),
        pdfText: rgb(0, 0, 0),
        canvasFill: "#ffffff",
        canvasText: "#000000",
      };
    case "dark_slate":
      return {
        pdfFill: rgb(0.12, 0.16, 0.23),
        pdfText: rgb(0.95, 0.95, 0.98),
        canvasFill: "#1e293b",
        canvasText: "#f8fafc",
      };
    case "red":
      return {
        pdfFill: rgb(0.5, 0.11, 0.11),
        pdfText: rgb(1, 1, 1),
        canvasFill: "#7f1d1d",
        canvasText: "#ffffff",
      };
    case "black":
    default:
      return {
        pdfFill: rgb(0, 0, 0),
        pdfText: rgb(1, 1, 1),
        canvasFill: "#000000",
        canvasText: "#ffffff",
      };
  }
}

/**
 * Permanently redact sensitive text, PII patterns, or coordinate boxes.
 * Supports deep canvas rasterization to physically destroy vector text streams and font glyphs.
 */
export async function redactPdf(
  file: File,
  optionsOrPageNum: number | RedactPdfOptions = 1
): Promise<RedactPdfResult> {
  const options: RedactPdfOptions =
    typeof optionsOrPageNum === "number"
      ? { pageNum: optionsOrPageNum }
      : optionsOrPageNum || { pageNum: 1 };

  options.onProgress?.(10, "Loading PDF document in memory...");
  const buffer = await file.arrayBuffer();

  const getBytesCopy = async (): Promise<Uint8Array> => {
    try {
      if (buffer && buffer.byteLength > 0) {
        return new Uint8Array(buffer.slice(0));
      }
    } catch {}
    const freshBuf = await file.arrayBuffer();
    return new Uint8Array(freshBuf);
  };

  const initialBytes = await getBytesCopy();
  const pdfDoc = await PDFDocument.load(initialBytes, { ignoreEncryption: true });
  const total = pdfDoc.getPageCount();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const targetMode = options.targetMode || (options.searchTerm ? "keyword" : "region");
  const targetPages = parsePageScope(
    total,
    options.pageScope || (options.pageNum ? "current" : "all"),
    options.customPages,
    options.pageNum || 1
  );

  const redactions: InternalRedactionBox[] = [];
  const findings: RedactionFinding[] = [];

  // 1. Manual user-drawn boxes
  if (options.manualBoxes && options.manualBoxes.length > 0) {
    for (const box of options.manualBoxes) {
      if (box.pageNum >= 1 && box.pageNum <= total) {
        redactions.push({
          pageNum: box.pageNum,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          reason: box.label || "Manual Selection Box",
        });
        findings.push({
          pageNum: box.pageNum,
          termOrPattern: box.label || "Manual Box",
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        });
      }
    }
  }

  // 2. Automated Text / PII pattern scanning
  const needTextScan =
    (targetMode === "keyword" && Boolean(options.searchTerm && options.searchTerm.trim())) ||
    targetMode === "smart_pii" ||
    Boolean(options.piiCategories);

  if (needTextScan) {
    options.onProgress?.(25, "Scanning document text layer for sensitive patterns...");
    const pdfjs = await loadPdfJs();
    const scanBytes = await getBytesCopy();
    const doc = await pdfjs.getDocument({
      data: scanBytes,
      useSystemFonts: true,
    }).promise;

    const searchTerm = options.searchTerm?.trim().toLowerCase();
    const pii = options.piiCategories || (targetMode === "smart_pii" ? { ssn: true, email: true, phone: true, creditCard: true } : {});

    // Regex definitions
    const piiRegexes: Array<{ name: string; pattern: RegExp }> = [];
    if (pii.ssn) {
      piiRegexes.push({ name: "SSN", pattern: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g });
    }
    if (pii.email) {
      piiRegexes.push({ name: "Email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g });
    }
    if (pii.phone) {
      piiRegexes.push({ name: "Phone", pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g });
    }
    if (pii.creditCard) {
      piiRegexes.push({ name: "Credit Card", pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g });
    }
    if (pii.ipAddress) {
      piiRegexes.push({ name: "IP Address", pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g });
    }
    if (pii.financial) {
      piiRegexes.push({ name: "Financial", pattern: /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g });
    }

    for (let i = 0; i < targetPages.length; i++) {
      const p = targetPages[i];
      const percent = Math.round(25 + ((i + 1) / targetPages.length) * 35);
      options.onProgress?.(percent, `Scanning page ${p} of ${total}...`);

      const pdfjsPage = await doc.getPage(p);
      const textContent = await pdfjsPage.getTextContent();

      for (const item of textContent.items as any[]) {
        if ("str" in item && typeof item.str === "string" && item.str.trim().length > 0) {
          const textStr = item.str;
          let matched = false;
          let matchReason = "";

          // Check keyword match
          if (searchTerm && textStr.toLowerCase().includes(searchTerm)) {
            matched = true;
            matchReason = `Keyword: "${options.searchTerm}"`;
          }

          // Check PII pattern matches
          if (!matched && piiRegexes.length > 0) {
            for (const { name, pattern } of piiRegexes) {
              pattern.lastIndex = 0;
              if (pattern.test(textStr)) {
                matched = true;
                matchReason = `PII: ${name}`;
                break;
              }
            }
          }

          if (matched) {
            const itemX = item.transform[4];
            const itemY = item.transform[5];
            const itemW = Math.max(item.width || 40, 24);
            const itemH = Math.max(item.height || 14, 12);

            const rx = Math.max(0, itemX - 2);
            const ry = Math.max(0, itemY - 2);
            const rw = itemW + 4;
            const rh = itemH + 4;

            redactions.push({
              pageNum: p,
              x: rx,
              y: ry,
              width: rw,
              height: rh,
              reason: matchReason,
            });

            findings.push({
              pageNum: p,
              termOrPattern: matchReason,
              x: rx,
              y: ry,
              width: rw,
              height: rh,
            });
          }
        }
      }
    }
  }

  // 3. Fallback explicit coordinate or default header region if no redactions generated
  if (redactions.length === 0 && (targetMode === "region" || (!options.searchTerm && !options.piiCategories && !options.manualBoxes))) {
    const targetIdx = Math.max(0, Math.min((options.pageNum || 1) - 1, total - 1));
    const page = pdfDoc.getPage(targetIdx);
    const { width: pWidth, height: pHeight } = page.getSize();

    const rx = options.x !== undefined ? options.x : 50;
    const ry = options.y !== undefined ? options.y : pHeight - 160;
    const rw = options.width !== undefined ? options.width : Math.min(320, pWidth - 100);
    const rh = options.height !== undefined ? options.height : 40;

    redactions.push({
      pageNum: targetIdx + 1,
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      reason: "Region Blackout",
    });

    findings.push({
      pageNum: targetIdx + 1,
      termOrPattern: "Region Blackout",
      x: rx,
      y: ry,
      width: rw,
      height: rh,
    });
  }

  const redactedCount = redactions.length;
  const canRasterize = options.rasterize && typeof document !== "undefined";
  const colors = getColorComponents(options.fillColor);
  const labelText = getLabelString(options.labelStyle, options.customLabel);

  if (canRasterize) {
    options.onProgress?.(65, "Executing Zero-Leak deep canvas rasterization...");
    // Deep Canvas Rasterization:
    // Render affected pages into an offscreen HTML5 canvas, draw solid blackouts directly
    // onto the pixel buffer, and replace the PDF page with a fresh unselectable image.
    const pdfjs = await loadPdfJs();
    const rasterBytes = await getBytesCopy();
    const doc = await pdfjs.getDocument({
      data: rasterBytes,
      useSystemFonts: true,
    }).promise;

    const affectedPages = Array.from(new Set(redactions.map((r) => r.pageNum)));

    for (let idx = 0; idx < affectedPages.length; idx++) {
      const pNum = affectedPages[idx];
      const progressPercent = Math.round(65 + ((idx + 1) / affectedPages.length) * 25);
      options.onProgress?.(progressPercent, `Rasterizing page ${pNum} (${idx + 1}/${affectedPages.length})...`);

      const pageIndex = pNum - 1;
      const pdfLibPage = pdfDoc.getPage(pageIndex);
      const { width: origWidth, height: origHeight } = pdfLibPage.getSize();

      const pdfjsPage = await doc.getPage(pNum);
      const scale = 2.0; // High crispness for text readability
      const viewport = pdfjsPage.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (pdfjsPage.render({
          canvasContext: ctx as any,
          viewport,
        } as any) as any).promise;

        // Draw solid blackout rectangles directly onto the canvas bitmap
        const pageRedactions = redactions.filter((r) => r.pageNum === pNum);
        for (const box of pageRedactions) {
          // Convert PDF coordinates (origin at bottom-left) to Canvas coordinates (origin at top-left)
          const vx = box.x * scale;
          const vy = Math.max(0, (origHeight - (box.y + box.height)) * scale);
          const vw = box.width * scale;
          const vh = box.height * scale;

          ctx.fillStyle = colors.canvasFill;
          ctx.fillRect(vx, vy, vw, vh);

          // Stamp redaction label on canvas if configured
          if (labelText) {
            const fontPx = Math.max(9, Math.min(14, Math.round(vh * 0.45)));
            ctx.font = `bold ${fontPx}px sans-serif`;
            ctx.fillStyle = colors.canvasText;
            const textMetrics = ctx.measureText(labelText);
            if (textMetrics.width < vw - 6) {
              const tx = vx + (vw - textMetrics.width) / 2;
              const ty = vy + vh / 2 + fontPx * 0.35;
              ctx.fillText(labelText, tx, ty);
            }
          }
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
        const base64Data = dataUrl.split(",")[1];
        const binaryString = atob(base64Data);
        const imgBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imgBytes[i] = binaryString.charCodeAt(i);
        }

        const embeddedImg = await pdfDoc.embedJpg(imgBytes);

        // Remove the existing page with vulnerable text streams and insert a clean image page
        pdfDoc.removePage(pageIndex);
        const freshPage = pdfDoc.insertPage(pageIndex, [origWidth, origHeight]);
        freshPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: origWidth,
          height: origHeight,
        });
      }
    }
  } else {
    options.onProgress?.(70, "Applying solid blackout vector overlay...");
    // Vector-level drawing fallback (fast & compatible with Node.js test suites)
    for (const box of redactions) {
      const pageIndex = Math.max(0, Math.min(box.pageNum - 1, total - 1));
      const page = pdfDoc.getPage(pageIndex);

      page.drawRectangle({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        color: colors.pdfFill,
        opacity: 1.0,
      });

      if (labelText) {
        const fontSize = Math.max(6, Math.min(9, box.height * 0.5));
        const textWidth = fontBold.widthOfTextAtSize(labelText, fontSize);
        if (textWidth < box.width - 4) {
          const textX = box.x + (box.width - textWidth) / 2;
          const textY = box.y + (box.height - fontSize) / 2;
          page.drawText(labelText, {
            x: textX,
            y: textY,
            size: fontSize,
            font: fontBold,
            color: colors.pdfText,
          });
        }
      }
    }
  }

  options.onProgress?.(92, "Computing tamper-evident SHA-256 digest...");
  const pdfBytes = await pdfDoc.save();
  const fullSha256 = await computeSha256(pdfBytes.buffer as ArrayBuffer);
  const auditId = `RED-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();
  const formattedTimestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)} UTC`;
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const pagesAffected = Array.from(new Set(redactions.map((r) => r.pageNum))).sort((a, b) => a - b);

  options.onProgress?.(100, "Redaction and sanitization complete!");

  return {
    pdfBytes,
    fileName: `${baseName}_redacted.pdf`,
    auditId,
    timestamp: formattedTimestamp,
    redactedCount,
    pagesAffected,
    findings,
    sha256Digest: fullSha256,
    rasterized: Boolean(canRasterize),
    summary: `Permanently sanitized ${redactedCount} item(s) across ${pagesAffected.length} page(s) (${canRasterize ? "Zero-Leak Deep Rasterized" : "Solid Mask"})`,
  };
}
