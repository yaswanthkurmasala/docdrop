"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PenTool,
  Type,
  Image as ImageIcon,
  Undo2,
  Trash2,
  Plus,
  Copy,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Move,
  Maximize2,
  Sparkles,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import {
  type SignatureMode,
  type SignatureInkColor,
  type CursiveStyle,
  type SignatureStampStyle,
  type SignaturePlacement,
} from "@/lib/pdf-tools/security/sign";

export interface SignStudioConfig {
  signerName: string;
  signerTitle: string;
  signerReason: string;
  mode: SignatureMode;
  inkColor: SignatureInkColor;
  cursiveStyle: CursiveStyle;
  stampStyle: SignatureStampStyle;
  signatureImage?: string;
  placements: SignaturePlacement[];
}

interface SignPdfStudioProps {
  file: File | null;
  value: SignStudioConfig;
  onChange: (next: SignStudioConfig) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

const INK_PALETTE: {
  id: SignatureInkColor;
  label: string;
  hex: string;
  dotClass: string;
}[] = [
  { id: "blue", label: "Navy", hex: "#0d38a6", dotClass: "bg-[#0d38a6]" },
  { id: "dark", label: "Black", hex: "#14161f", dotClass: "bg-[#14161f] dark:bg-zinc-200" },
  { id: "crimson", label: "Crimson", hex: "#b31924", dotClass: "bg-[#b31924]" },
  { id: "emerald", label: "Emerald", hex: "#057352", dotClass: "bg-[#057352]" },
  { id: "purple", label: "Purple", hex: "#59148c", dotClass: "bg-[#59148c]" },
];

function getInkHex(ink: SignatureInkColor): string {
  return INK_PALETTE.find((i) => i.id === ink)?.hex || "#0d38a6";
}

function getInitials(name: string): string {
  const parts = (name || "A S").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}.${parts[parts.length - 1][0]}.`.toUpperCase();
}

/**
 * Trims transparent padding from an HTML canvas and returns a crisp tight PNG DataURL
 */
function exportTrimmedCanvasPng(source: HTMLCanvasElement): string | null {
  const ctx = source.getContext("2d");
  if (!ctx) return null;
  const w = source.width;
  const h = source.height;
  const imgData = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = imgData[(y * w + x) * 4 + 3];
      if (alpha > 8) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) return null;

  const pad = 12;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;
  outCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return out.toDataURL("image/png");
}

/**
 * Generates a high-DPI transparent calligraphic PNG for typed signatures
 */
function renderTypedSignatureToPng(
  text: string,
  style: CursiveStyle,
  inkHex: string
): string | null {
  if (typeof document === "undefined" || !text.trim()) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 760;
  canvas.height = 220;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const fontStack =
    style === "script"
      ? `italic 600 92px "Brush Script MT", "Segoe Script", "Apple Chancery", Georgia, cursive`
      : style === "formal"
      ? `italic 500 78px Georgia, "Times New Roman", serif`
      : style === "bold"
      ? `italic 700 74px "Trebuchet MS", Helvetica, sans-serif`
      : `italic 600 82px "Palatino Linotype", Palatino, Georgia, serif`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = fontStack;
  ctx.fillStyle = inkHex;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Shrink font proportionally if text is very long
  const measured = ctx.measureText(text).width;
  if (measured > 680) {
    const scale = 680 / measured;
    const basePx = style === "script" ? 92 : 78;
    ctx.font = fontStack.replace(/\d+px/, `${Math.max(36, Math.floor(basePx * scale))}px`);
  }

  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return exportTrimmedCanvasPng(canvas);
}

/**
 * Adaptive local-illumination + global contrast background remover.
 * Strips uniform white paper, shadowed/grey indoor phone photos, and PNG crops with transparent borders.
 */
async function removePaperBackground(
  dataUrl: string,
  sensitivity: number = 55,
  recolorHex?: string | null
): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      // Scale down very large camera photos cleanly for fast crisp output
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const totalPixels = w * h;

      // Inspect alpha + opaque luminance distribution to distinguish an already-cutout
      // transparent signature from a PNG screenshot/crop that still contains a paper box.
      let transparentCount = 0;
      const opaqueLums: number[] = [];
      const strideSample = Math.max(1, Math.floor(totalPixels / 8000));
      for (let i = 0; i < totalPixels; i++) {
        const a = data[i * 4 + 3];
        if (a < 180) {
          transparentCount++;
        } else if (i % strideSample === 0) {
          const idx = i * 4;
          opaqueLums.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        }
      }

      const transparentFrac = transparentCount / totalPixels;
      let paperP80 = 255;
      let inkP10 = 0;
      if (opaqueLums.length > 10) {
        opaqueLums.sort((a, b) => a - b);
        inkP10 = opaqueLums[Math.floor(opaqueLums.length * 0.1)];
        paperP80 = opaqueLums[Math.floor(opaqueLums.length * 0.8)];
      }

      // Preserve PNGs that are genuinely already pure ink on transparent alpha (no paper box)
      const isPureTransparentCutout =
        transparentFrac > 0.35 && (paperP80 < 115 || paperP80 - inkP10 < 38);
      if (isPureTransparentCutout) {
        return resolve(exportTrimmedCanvasPng(canvas) || canvas.toDataURL("image/png"));
      }

      // Fallback paper brightness for transparent regions so border alpha doesn't skew local averages
      const fallbackBg = opaqueLums.length > 0 ? paperP80 : 220;

      // 1. Compute luminance array (preserving already-transparent mask separately)
      const lum = new Float32Array(totalPixels);
      const origOpaque = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        if (data[idx + 3] >= 128) {
          origOpaque[i] = 1;
          lum[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        } else {
          origOpaque[i] = 0;
          lum[i] = fallbackBg;
        }
      }

      // 2. Build prefix sum (integral image) over (w+1) x (h+1) for O(1) window means
      const stride = w + 1;
      const integral = new Float64Array(stride * (h + 1));
      for (let y = 0; y < h; y++) {
        let rowSum = 0;
        const lumRow = y * w;
        const intRow = (y + 1) * stride;
        const prevRow = y * stride;
        for (let x = 0; x < w; x++) {
          rowSum += lum[lumRow + x];
          integral[intRow + x + 1] = integral[prevRow + x + 1] + rowSum;
        }
      }

      // Generous window radius (~12% of min dimension) prevents hollowing thick ink strokes
      const radius = Math.max(18, Math.min(72, Math.round(Math.min(w, h) * 0.12)));

      // Map sensitivity (15..90) -> required darkness delta below local paper brightness
      const minDelta = Math.max(7, Math.round(38 - sensitivity * 0.34));
      const fullInkDelta = minDelta + 16;

      let tintR = 20;
      let tintG = 24;
      let tintB = 34;
      if (recolorHex && /^#[0-9a-fA-F]{6}$/.test(recolorHex)) {
        tintR = parseInt(recolorHex.slice(1, 3), 16);
        tintG = parseInt(recolorHex.slice(3, 5), 16);
        tintB = parseInt(recolorHex.slice(5, 7), 16);
      }

      // 3. Threshold each pixel relative to its local paper neighborhood
      for (let y = 0; y < h; y++) {
        const y0 = Math.max(0, y - radius);
        const y1 = Math.min(h - 1, y + radius);
        const rOffset0 = y0 * stride;
        const rOffset1 = (y1 + 1) * stride;

        for (let x = 0; x < w; x++) {
          const pIdx = y * w + x;
          const rgbaIdx = pIdx * 4;
          if (!origOpaque[pIdx]) {
            data[rgbaIdx + 3] = 0;
            continue;
          }

          const x0 = Math.max(0, x - radius);
          const x1 = Math.min(w - 1, x + radius);
          const area = (x1 - x0 + 1) * (y1 - y0 + 1);

          const sum =
            integral[rOffset1 + x1 + 1] -
            integral[rOffset0 + x1 + 1] -
            integral[rOffset1 + x0] +
            integral[rOffset0 + x0];
          const localPaperBg = sum / area;

          const delta = localPaperBg - lum[pIdx];

          if (delta <= minDelta) {
            data[rgbaIdx + 3] = 0;
          } else if (delta < fullInkDelta) {
            const t = (delta - minDelta) / (fullInkDelta - minDelta);
            data[rgbaIdx + 3] = Math.round(t * 255);
            if (recolorHex) {
              data[rgbaIdx] = tintR;
              data[rgbaIdx + 1] = tintG;
              data[rgbaIdx + 2] = tintB;
            }
          } else {
            data[rgbaIdx + 3] = 255;
            if (recolorHex) {
              data[rgbaIdx] = tintR;
              data[rgbaIdx + 1] = tintG;
              data[rgbaIdx + 2] = tintB;
            } else {
              // Subtle contrast boost so faint ballpoint ink reads crisply
              data[rgbaIdx] = Math.max(0, Math.round(data[rgbaIdx] * 0.72));
              data[rgbaIdx + 1] = Math.max(0, Math.round(data[rgbaIdx + 1] * 0.72));
              data[rgbaIdx + 2] = Math.max(0, Math.round(data[rgbaIdx + 2] * 0.72));
            }
          }
        }
      }

      // 4. Despeckle isolated single-pixel paper noise so auto-trim crops tight to strokes
      if (w > 4 && h > 4) {
        const alphaCopy = new Uint8Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) alphaCopy[i] = data[i * 4 + 3];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            if (alphaCopy[i] === 0) continue;
            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (alphaCopy[(y + dy) * w + (x + dx)] > 24) neighbors++;
              }
            }
            if (neighbors === 0) {
              data[i * 4 + 3] = 0;
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(exportTrimmedCanvasPng(canvas) || canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function SignPdfStudio({ file, value, onChange }: SignPdfStudioProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagePreviews, setPagePreviews] = useState<
    Record<number, { url: string; aspectRatio: number }>
  >({});
  const [isRenderingPage, setIsRenderingPage] = useState(false);

  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    value.placements[0]?.id || null
  );

  // Draw pad state
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const [strokeThickness, setStrokeThickness] = useState<number>(3);
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [rawUploadedDataUrl, setRawUploadedDataUrl] = useState<string | null>(null);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [removeBgEnabled, setRemoveBgEnabled] = useState(true);
  const [bgSensitivity, setBgSensitivity] = useState<number>(56);
  const [recolorUploadedInk, setRecolorUploadedInk] = useState<boolean>(false);

  // Interactive Drag & Resize state on PDF Canvas
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const dragActionRef = useRef<{
    type: "move" | "resize";
    placementId: string;
    startClientX: number;
    startClientY: number;
    startXPercent: number;
    startYPercent: number;
    startWPercent: number;
    startHPercent: number;
  } | null>(null);

  const inkHex = getInkHex(value.inkColor);

  // Sync rendered typed PNG automatically when mode === "type"
  const typedPreviewPng = React.useMemo(() => {
    if (value.mode !== "type") return null;
    return renderTypedSignatureToPng(
      value.signerName || "Authorized Signer",
      value.cursiveStyle,
      inkHex
    );
  }, [value.mode, value.signerName, value.cursiveStyle, inkHex]);

  // Reactively clean uploaded photo whenever toggle, sensitivity, or ink color changes
  useEffect(() => {
    let cancelled = false;
    if (!rawUploadedDataUrl) {
      setUploadedDataUrl(null);
      return;
    }
    if (!removeBgEnabled) {
      setUploadedDataUrl(rawUploadedDataUrl);
      return;
    }
    removePaperBackground(
      rawUploadedDataUrl,
      bgSensitivity,
      recolorUploadedInk ? inkHex : null
    ).then((cleaned) => {
      if (!cancelled) setUploadedDataUrl(cleaned);
    });
    return () => {
      cancelled = true;
    };
  }, [rawUploadedDataUrl, removeBgEnabled, bgSensitivity, recolorUploadedInk, inkHex]);

  // Keep parent `signatureImage` synchronized with active mode
  useEffect(() => {
    let nextImg: string | undefined = undefined;
    if (value.mode === "draw") nextImg = drawnDataUrl || undefined;
    else if (value.mode === "upload") nextImg = uploadedDataUrl || undefined;
    else nextImg = typedPreviewPng || undefined;

    if (nextImg !== value.signatureImage) {
      onChange({ ...value, signatureImage: nextImg });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.mode, drawnDataUrl, uploadedDataUrl, typedPreviewPng]);

  // Load PDF metadata & jump to last page when a new file is uploaded
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    setPagePreviews({});
    pdfDocRef.current = null;

    if (!file) {
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    (async () => {
      try {
        setIsRenderingPage(true);
        const pdfjs = await import("@/lib/pdf-tools/common/pdfjs-loader").then((m) =>
          m.loadPdfJs()
        );
        const buffer = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({
          data: new Uint8Array(buffer.slice(0)),
          useSystemFonts: true,
        }).promise;

        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        const defaultPage = doc.numPages; // Signatures typically default to final page
        setCurrentPage(defaultPage);

        // Update initial placement to point to final page if user hasn't customized yet
        if (value.placements.length === 1 && value.placements[0].id === "sig_default") {
          onChange({
            ...value,
            placements: [{ ...value.placements[0], pageNumber: defaultPage }],
          });
        }
      } catch (err) {
        console.warn("SignStudio PDF load error:", err);
      } finally {
        if (!cancelled) setIsRenderingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Render active page image at crisp resolution on demand
  useEffect(() => {
    let cancelled = false;
    const doc = pdfDocRef.current;
    if (!doc || pagePreviews[currentPage]) return;

    (async () => {
      try {
        setIsRenderingPage(true);
        const page = await doc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;

        if (cancelled) return;
        const url = canvas.toDataURL("image/webp", 0.9);
        const aspectRatio = viewport.width / viewport.height;

        setPagePreviews((prev) => ({
          ...prev,
          [currentPage]: { url, aspectRatio },
        }));
      } catch (err) {
        console.warn("Could not render PDF page:", err);
      } finally {
        if (!cancelled) setIsRenderingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPage, totalPages, pagePreviews]);

  // Redraw freehand strokes cleanly onto drawing canvas (with quadratic curve smoothing)
  const redrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (stroke: Stroke) => {
      const pts = stroke.points;
      if (pts.length === 0) return;

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();
    };

    strokesRef.current.forEach(drawStroke);
    if (activeStrokeRef.current) drawStroke(activeStrokeRef.current);
  }, []);

  // Recolor existing strokes smoothly when ink color changes
  useEffect(() => {
    if (strokesRef.current.length > 0) {
      strokesRef.current = strokesRef.current.map((s) => ({ ...s, color: inkHex }));
      redrawCanvas();
      const canvas = drawCanvasRef.current;
      if (canvas) {
        setDrawnDataUrl(exportTrimmedCanvasPng(canvas));
      }
    }
  }, [inkHex, redrawCanvas]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleDrawDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCanvasPoint(e);
    activeStrokeRef.current = {
      points: [pt],
      color: inkHex,
      width: strokeThickness * 2,
    };
    redrawCanvas();
  };

  const handleDrawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    const pt = getCanvasPoint(e);
    activeStrokeRef.current.points.push(pt);
    redrawCanvas();
  };

  const handleDrawUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (activeStrokeRef.current && activeStrokeRef.current.points.length > 0) {
      strokesRef.current.push(activeStrokeRef.current);
    }
    activeStrokeRef.current = null;
    redrawCanvas();
    const canvas = drawCanvasRef.current;
    if (canvas) {
      setDrawnDataUrl(exportTrimmedCanvasPng(canvas));
    }
  };

  const handleUndoStroke = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    redrawCanvas();
    const canvas = drawCanvasRef.current;
    if (canvas) {
      setDrawnDataUrl(exportTrimmedCanvasPng(canvas));
    }
  };

  const handleClearDraw = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    redrawCanvas();
    setDrawnDataUrl(null);
  };

  // Drag & Resize pointer handlers on PDF Preview Page
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const action = dragActionRef.current;
      const container = pageContainerRef.current;
      if (!action || !container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dxPercent = ((e.clientX - action.startClientX) / rect.width) * 100;
      const dyPercent = ((e.clientY - action.startClientY) / rect.height) * 100;

      const updated = value.placements.map((item) => {
        if (item.id !== action.placementId) return item;

        if (action.type === "move") {
          const nextX = Math.max(1, Math.min(action.startXPercent + dxPercent, 99 - item.widthPercent));
          const nextY = Math.max(1, Math.min(action.startYPercent + dyPercent, 99 - item.heightPercent));
          return {
            ...item,
            xPercent: Number(nextX.toFixed(2)),
            yPercent: Number(nextY.toFixed(2)),
          };
        } else {
          // resize
          const nextW = Math.max(10, Math.min(action.startWPercent + dxPercent, 98 - item.xPercent));
          const nextH = Math.max(4, Math.min(action.startHPercent + dyPercent, 98 - item.yPercent));
          return {
            ...item,
            widthPercent: Number(nextW.toFixed(2)),
            heightPercent: Number(nextH.toFixed(2)),
          };
        }
      });

      onChange({ ...value, placements: updated });
    };

    const handlePointerUp = () => {
      dragActionRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [value, onChange]);

  const startDragItem = (
    e: React.PointerEvent,
    item: SignaturePlacement,
    type: "move" | "resize"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedPlacementId(item.id);
    dragActionRef.current = {
      type,
      placementId: item.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startXPercent: item.xPercent,
      startYPercent: item.yPercent,
      startWPercent: item.widthPercent,
      startHPercent: item.heightPercent,
    };
  };

  // Click empty area on PDF page to move active placement or drop a new one on this page
  const handlePageCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragActionRef.current) return;
    const container = pageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    // Look for a placement already on currentPage to reposition
    const pagePlacements = value.placements.filter((p) => p.pageNumber === currentPage);
    const targetId =
      pagePlacements.find((p) => p.id === selectedPlacementId)?.id || pagePlacements[0]?.id;

    if (targetId) {
      const updated = value.placements.map((p) => {
        if (p.id !== targetId) return p;
        const nextX = Math.max(1, Math.min(clickXPercent - p.widthPercent / 2, 99 - p.widthPercent));
        const nextY = Math.max(1, Math.min(clickYPercent - p.heightPercent / 2, 99 - p.heightPercent));
        return {
          ...p,
          xPercent: Number(nextX.toFixed(2)),
          yPercent: Number(nextY.toFixed(2)),
        };
      });
      setSelectedPlacementId(targetId);
      onChange({ ...value, placements: updated });
    } else {
      // No signature on this page yet -> drop a new one right where user clicked!
      const isBadge = value.stampStyle === "badge";
      const w = isBadge ? 34 : 26;
      const h = isBadge ? 14 : 9;
      const newPlacement: SignaturePlacement = {
        id: `sig_${Date.now()}`,
        pageNumber: currentPage,
        xPercent: Number(Math.max(2, Math.min(clickXPercent - w / 2, 98 - w)).toFixed(2)),
        yPercent: Number(Math.max(2, Math.min(clickYPercent - h / 2, 98 - h)).toFixed(2)),
        widthPercent: w,
        heightPercent: h,
        kind: "signature",
      };
      setSelectedPlacementId(newPlacement.id);
      onChange({ ...value, placements: [...value.placements, newPlacement] });
    }
  };

  const handleAddElement = (kind: "signature" | "initials" | "date") => {
    const isBadge = value.stampStyle === "badge" && kind === "signature";
    const w = kind === "signature" ? (isBadge ? 34 : 26) : kind === "date" ? 18 : 12;
    const h = kind === "signature" ? (isBadge ? 14 : 9) : 6;
    const offsetCount = value.placements.filter((p) => p.pageNumber === currentPage).length;

    const newItem: SignaturePlacement = {
      id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      pageNumber: currentPage,
      xPercent: Math.min(70, 56 - offsetCount * 4),
      yPercent: Math.min(82, 78 - offsetCount * 8),
      widthPercent: w,
      heightPercent: h,
      kind,
    };
    setSelectedPlacementId(newItem.id);
    onChange({ ...value, placements: [...value.placements, newItem] });
  };

  const handleDeletePlacement = (id: string) => {
    const remaining = value.placements.filter((p) => p.id !== id);
    onChange({ ...value, placements: remaining });
    if (selectedPlacementId === id) {
      setSelectedPlacementId(remaining[0]?.id || null);
    }
  };

  const handleStampAllPages = () => {
    const template =
      value.placements.find((p) => p.id === selectedPlacementId) ||
      value.placements.find((p) => p.pageNumber === currentPage) ||
      value.placements[0];
    if (!template) return;

    const allPagesPlacements: SignaturePlacement[] = [];
    for (let p = 1; p <= totalPages; p++) {
      allPagesPlacements.push({
        ...template,
        id: `sig_p${p}_${Date.now()}`,
        pageNumber: p,
      });
    }
    onChange({ ...value, placements: allPagesPlacements });
  };

  const currentPagePlacements = value.placements.filter((p) => p.pageNumber === currentPage);
  const activePreview = pagePreviews[currentPage];
  const aspectRatio = activePreview?.aspectRatio || 1 / 1.414;

  const activeVisualSignature =
    value.mode === "draw"
      ? drawnDataUrl
      : value.mode === "upload"
      ? uploadedDataUrl
      : typedPreviewPng;

  return (
    <div className="space-y-4">
      {/* Main 2-Column Interactive Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Interactive Drag-and-Drop Document Canvas */}
        <div className="lg:col-span-7 flex flex-col p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
          {/* Top Bar: Page Navigator + Quick Add Actions */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 disabled:opacity-40 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold px-2 text-zinc-800 dark:text-zinc-200">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 disabled:opacity-40 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddElement("signature")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> Signature
              </button>
              <button
                type="button"
                onClick={() => handleAddElement("initials")}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-sky-400 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> Initials
              </button>
              <button
                type="button"
                onClick={() => handleAddElement("date")}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-sky-400 cursor-pointer transition-colors"
              >
                <Calendar className="w-3 h-3" /> Date
              </button>
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={handleStampAllPages}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer transition-colors"
                  title="Copy current placement to every page"
                >
                  <Copy className="w-3 h-3" /> All Pages
                </button>
              )}
            </div>
          </div>

          {/* Interactive Instruction Hint */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 px-1">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Drag to position, drag corner ↘ to resize, or click anywhere on the page to place.</span>
            </span>
            <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
              {value.placements.length} placed
            </span>
          </div>

          {/* Interactive Page Preview Canvas */}
          <div className="w-full flex justify-center py-1">
            <div
              ref={pageContainerRef}
              onClick={handlePageCanvasClick}
              style={{ aspectRatio: String(aspectRatio) }}
              className="relative w-full max-w-[460px] bg-white rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-lg overflow-hidden select-none cursor-crosshair touch-none"
            >
              {/* Actual PDF Page Image or Mock Paper */}
              {activePreview?.url ? (
                <img
                  src={activePreview.url}
                  alt={`PDF Page ${currentPage}`}
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              ) : (
                <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none opacity-30">
                  <div className="space-y-2">
                    <div className="h-4 w-2/5 bg-zinc-400 rounded" />
                    <div className="h-2 w-full bg-zinc-300 rounded" />
                    <div className="h-2 w-11/12 bg-zinc-300 rounded" />
                    <div className="h-2 w-4/5 bg-zinc-300 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-zinc-300 rounded" />
                    <div className="h-2 w-5/6 bg-zinc-300 rounded" />
                    <div className="h-2 w-3/4 bg-zinc-300 rounded" />
                  </div>
                  <div className="flex justify-between items-end pt-8 border-t border-zinc-200">
                    <div className="w-28 h-1 border-b border-zinc-400" />
                    <div className="w-36 h-1 border-b border-zinc-400" />
                  </div>
                </div>
              )}

              {isRenderingPage && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
                  <span className="text-xs font-mono font-bold text-zinc-700 bg-white px-3 py-1.5 rounded-lg shadow-sm border">
                    Rendering Page {currentPage}...
                  </span>
                </div>
              )}

              {/* Empty Page Hint Overlay if no placement on this page */}
              {currentPagePlacements.length === 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-zinc-900/80 text-white text-[11px] font-medium pointer-events-none shadow-md">
                  Click anywhere on Page {currentPage} to place signature
                </div>
              )}

              {/* Overlaid Draggable & Resizable Placements */}
              {currentPagePlacements.map((item) => {
                const isSelected = selectedPlacementId === item.id;
                const kind = item.kind || "signature";

                return (
                  <div
                    key={item.id}
                    onPointerDown={(e) => startDragItem(e, item, "move")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlacementId(item.id);
                    }}
                    style={{
                      left: `${item.xPercent}%`,
                      top: `${item.yPercent}%`,
                      width: `${item.widthPercent}%`,
                      height: `${item.heightPercent}%`,
                    }}
                    className={`absolute z-10 group cursor-grab active:cursor-grabbing rounded-md transition-shadow ${
                      isSelected
                        ? "ring-2 ring-sky-500 bg-sky-500/[0.06] shadow-md"
                        : "ring-1 ring-sky-400/50 hover:ring-sky-500 bg-sky-500/[0.03]"
                    }`}
                  >
                    {/* Delete Handle (top-right) */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlacement(item.id);
                      }}
                      title="Remove from page"
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer z-30"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>

                    {/* Corner Resize Handle (bottom-right) */}
                    <div
                      onPointerDown={(e) => startDragItem(e, item, "resize")}
                      title="Drag to resize"
                      className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-md cursor-nwse-resize z-30 hover:scale-110 transition-transform"
                    >
                      <Maximize2 className="w-2.5 h-2.5 rotate-90" />
                    </div>

                    {/* Visual Content inside Box */}
                    {kind === "date" ? (
                      <div
                        className="w-full h-full flex items-center justify-center font-mono font-bold text-xs px-1"
                        style={{ color: inkHex }}
                      >
                        {item.textOverride || new Date().toISOString().slice(0, 10)}
                      </div>
                    ) : kind === "initials" ? (
                      <div
                        className="w-full h-full flex items-center justify-center font-serif italic font-bold text-base px-1"
                        style={{ color: inkHex }}
                      >
                        {item.textOverride || getInitials(value.signerName)}
                      </div>
                    ) : value.stampStyle === "badge" ? (
                      <div className="w-full h-full rounded border border-sky-400/60 bg-white/95 flex flex-col justify-between overflow-hidden text-left shadow-xs">
                        <div
                          className="px-1.5 py-0.5 text-[8px] font-bold text-white flex items-center justify-between leading-none"
                          style={{ backgroundColor: inkHex }}
                        >
                          <span className="truncate">VERIFIED SIGNATURE</span>
                          <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                        </div>
                        <div className="flex-1 flex items-center justify-center px-1.5 py-0.5 min-h-0">
                          {activeVisualSignature ? (
                            <img
                              src={activeVisualSignature}
                              alt="Signature Preview"
                              draggable={false}
                              className="max-w-full max-h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <span className="font-serif italic text-xs truncate" style={{ color: inkHex }}>
                              {value.signerName}
                            </span>
                          )}
                        </div>
                        <div className="px-1.5 pb-0.5 text-[7px] font-mono text-zinc-600 leading-tight truncate border-t border-zinc-100">
                          {value.signerName} • SHA-256
                        </div>
                      </div>
                    ) : value.stampStyle === "line" ? (
                      <div className="w-full h-full flex flex-col justify-end p-0.5">
                        <div className="flex-1 flex items-center justify-center min-h-0">
                          {activeVisualSignature ? (
                            <img
                              src={activeVisualSignature}
                              alt="Signature Preview"
                              draggable={false}
                              className="max-w-full max-h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <span className="font-serif italic text-sm truncate" style={{ color: inkHex }}>
                              {value.signerName}
                            </span>
                          )}
                        </div>
                        <div className="border-t border-zinc-500 pt-0.5 text-[7px] font-mono text-zinc-600 truncate text-center leading-none">
                          Signed by {value.signerName} • {new Date().toISOString().slice(0, 10)}
                        </div>
                      </div>
                    ) : (
                      /* Pure Ink Only — transparent crisp overlay */
                      <div className="w-full h-full flex items-center justify-center p-0.5">
                        {activeVisualSignature ? (
                          <img
                            src={activeVisualSignature}
                            alt="Signature Preview"
                            draggable={false}
                            className="max-w-full max-h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <span className="font-serif italic text-base truncate" style={{ color: inkHex }}>
                            {value.signerName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Placed Signatures Summary Pills */}
          {value.placements.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-500 mr-1">Active Stamps:</span>
              {value.placements.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCurrentPage(p.pageNumber);
                    setSelectedPlacementId(p.id);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border cursor-pointer transition-colors ${
                    p.id === selectedPlacementId
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300 font-bold"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span>
                    #{idx + 1} {(p.kind || "sig").toUpperCase()} (P.{p.pageNumber})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Signature Studio Creator & Customization */}
        <div className="lg:col-span-5 space-y-4">
          {/* Creation Mode Switcher: Draw vs Type vs Upload */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>1. Create Your Signature</span>
              <span className="text-[11px] font-mono text-zinc-400">High-DPI PNG</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "draw" as const, label: "Draw", icon: PenTool },
                { id: "type" as const, label: "Type", icon: Type },
                { id: "upload" as const, label: "Upload", icon: ImageIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = value.mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange({ ...value, mode: tab.id })}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Draw Pad Mode */}
            {value.mode === "draw" && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Pen Size:
                    </span>
                    <input
                      type="range"
                      min={1.5}
                      max={6}
                      step={0.5}
                      value={strokeThickness}
                      onChange={(e) => setStrokeThickness(Number(e.target.value))}
                      className="w-20 accent-sky-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUndoStroke}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                    >
                      <Undo2 className="w-3 h-3" /> Undo
                    </button>
                    <button
                      type="button"
                      onClick={handleClearDraw}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-white overflow-hidden touch-none">
                  <canvas
                    ref={drawCanvasRef}
                    width={640}
                    height={220}
                    onPointerDown={handleDrawDown}
                    onPointerMove={handleDrawMove}
                    onPointerUp={handleDrawUp}
                    onPointerCancel={handleDrawUp}
                    className="w-full h-36 cursor-crosshair block"
                  />
                  <div className="absolute inset-x-6 bottom-4 border-b border-zinc-200 pointer-events-none flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Draw smoothly above line</span>
                    <span>HD Bezier Ink</span>
                  </div>
                </div>

                {drawnDataUrl ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Crisp transparent signature ready!
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    Use your mouse, trackpad, or finger to sign above.
                  </p>
                )}
              </div>
            )}

            {/* Type Mode */}
            {value.mode === "type" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={value.signerName}
                      onChange={(e) => onChange({ ...value, signerName: e.target.value })}
                      placeholder="Yaswanth Kurmasala"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Title / Role
                    </label>
                    <input
                      type="text"
                      value={value.signerTitle}
                      onChange={(e) => onChange({ ...value, signerTitle: e.target.value })}
                      placeholder="Authorized Signatory"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sky-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "script" as const, label: "Brush Script", style: { fontFamily: '"Brush Script MT", "Segoe Script", cursive' } },
                    { id: "formal" as const, label: "Classic Serif", style: { fontFamily: 'Georgia, serif', fontStyle: "italic" } },
                    { id: "bold" as const, label: "Executive Bold", style: { fontFamily: '"Trebuchet MS", sans-serif', fontStyle: "italic", fontWeight: 700 } },
                    { id: "modern" as const, label: "Elegant Italic", style: { fontFamily: 'Palatino, Georgia, serif', fontStyle: "italic" } },
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => onChange({ ...value, cursiveStyle: font.id })}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        value.cursiveStyle === font.id
                          ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 shadow-xs"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <span
                        className="block text-sm truncate"
                        style={{ ...font.style, color: inkHex }}
                      >
                        {value.signerName || "Signature"}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                        {font.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Mode */}
            {value.mode === "upload" && (
              <div className="space-y-2.5 pt-1">
                <div className="space-y-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <label className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                      Auto-remove paper background
                    </span>
                    <input
                      type="checkbox"
                      checked={removeBgEnabled}
                      onChange={(e) => setRemoveBgEnabled(e.target.checked)}
                      className="rounded accent-sky-600 cursor-pointer"
                    />
                  </label>

                  {removeBgEnabled && (
                    <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                          Ink Pickup Sensitivity:
                        </span>
                        <input
                          type="range"
                          min={15}
                          max={85}
                          step={2}
                          value={bgSensitivity}
                          onChange={(e) => setBgSensitivity(Number(e.target.value))}
                          className="w-28 accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <label className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 cursor-pointer">
                        <span>Recolor ink to selected pen color</span>
                        <input
                          type="checkbox"
                          checked={recolorUploadedInk}
                          onChange={(e) => setRecolorUploadedInk(e.target.checked)}
                          className="rounded accent-sky-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {uploadedDataUrl ? (
                  <div
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-700"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #f4f4f5 25%, transparent 25%), linear-gradient(-45deg, #f4f4f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f4f4f5 75%), linear-gradient(-45deg, transparent 75%, #f4f4f5 75%)",
                      backgroundSize: "14px 14px",
                      backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <img
                      src={uploadedDataUrl}
                      alt="Uploaded Signature"
                      className="h-14 max-w-[200px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRawUploadedDataUrl(null);
                        setUploadedDataUrl(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/95 border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer shadow-2xs"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-sky-400 rounded-xl cursor-pointer bg-white dark:bg-zinc-900 transition-colors">
                    <ImageIcon className="w-6 h-6 text-zinc-400 mb-1" />
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Upload Signature Photo / PNG
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Indoor/shadowed paper auto-converted to transparent ink
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onClick={(e) => {
                        (e.currentTarget as HTMLInputElement).value = "";
                      }}
                      onChange={(e) => {
                        const imgFile = e.target.files?.[0];
                        if (!imgFile) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const raw = ev.target?.result as string;
                          if (raw) setRawUploadedDataUrl(raw);
                        };
                        reader.readAsDataURL(imgFile);
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* 2. Ink Color & Presentation Style */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                2. Ink Color
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {INK_PALETTE.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    onClick={() => onChange({ ...value, inkColor: ink.id })}
                    className={`py-1.5 px-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      value.inkColor === ink.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${ink.dotClass}`} />
                    <span>{ink.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                3. Signature Style on PDF
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "pure" as const, label: "Pure Ink", desc: "Signature only" },
                  { id: "line" as const, label: "Clean Line", desc: "Name + Date" },
                  { id: "badge" as const, label: "Audit Box", desc: "ISO 32000 Seal" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onChange({ ...value, stampStyle: st.id })}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      value.stampStyle === st.id
                        ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-900 dark:text-sky-200 shadow-xs"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <span className="block text-[11px] font-bold">{st.label}</span>
                    <span className="block text-[10px] text-zinc-500 leading-tight">
                      {st.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Audit Metadata if Badge selected */}
            {value.stampStyle === "badge" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-0.5">
                    Signing Reason
                  </label>
                  <select
                    value={value.signerReason}
                    onChange={(e) => onChange({ ...value, signerReason: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value="Approved & Accepted">Approved & Accepted</option>
                    <option value="Reviewed & Formally Verified">Reviewed & Verified</option>
                    <option value="Authorized Corporate Sign-Off">Authorized Sign-Off</option>
                    <option value="Acknowledged & Received">Acknowledged & Received</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-0.5">
                    Signer Capacity / Title
                  </label>
                  <input
                    type="text"
                    value={value.signerTitle}
                    onChange={(e) => onChange({ ...value, signerTitle: e.target.value })}
                    placeholder="Authorized Signatory"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
