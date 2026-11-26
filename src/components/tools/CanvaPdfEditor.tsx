"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Type,
  Highlighter,
  Eraser,
  Stamp,
  MousePointer,
  Bold,
  Italic,
  Undo,
  Redo,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  Layers,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Palette,
  Loader2,
  Sliders,
  Move,
} from "lucide-react";
import {
  LivePdfEdits,
  LiveTextSpanEdit,
  LiveAddedText,
  LiveWhiteout,
  LiveHighlight,
  LiveStampPlacement,
  LiveFontFamily,
  applyLivePdfEdits,
  LivePdfEditorResult,
} from "@/lib/pdf-tools/edit/live-editor";

interface ExtractedTextSpan {
  id: string;
  str: string;
  dir: string;
  width: number; // PDF points
  height: number; // PDF points
  transform: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  fontName: string;
  detectedFamily: LiveFontFamily;
  detectedBold: boolean;
  detectedItalic: boolean;
  fontSize: number; // PDF points
  // Viewport coordinates for interactive overlay
  vx: number;
  vy: number;
  vWidth: number;
  vHeight: number;
}

interface CanvaPdfEditorProps {
  file: File;
  onSave?: (result: LivePdfEditorResult) => void;
  onCancel?: () => void;
}

type ToolMode = "select" | "add-text" | "whiteout" | "highlight" | "stamp";

const COLOR_PALETTE = [
  { label: "Black", hex: "#000000" },
  { label: "Dark Gray", hex: "#374151" },
  { label: "Doc Navy", hex: "#1E3A8A" },
  { label: "Royal Blue", hex: "#2563EB" },
  { label: "Crimson Red", hex: "#DC2626" },
  { label: "Emerald Green", hex: "#059669" },
  { label: "Amethyst Purple", hex: "#7C3AED" },
  { label: "Amber Orange", hex: "#D97706" },
  { label: "Pure White", hex: "#FFFFFF" },
];

const HIGHLIGHT_COLORS = [
  { label: "Neon Yellow", hex: "#FEF08A" },
  { label: "Mint Green", hex: "#BBF7D0" },
  { label: "Soft Pink", hex: "#FBCFE8" },
  { label: "Sky Cyan", hex: "#BAE6FD" },
];

const STAMP_PRESETS = [
  {
    id: "approved",
    text: "APPROVED",
    subtitle: "VERIFIED & SIGNED",
    tone: "approved" as const,
    color: "#059669",
    rotation: -10,
  },
  {
    id: "confidential",
    text: "CONFIDENTIAL",
    subtitle: "INTERNAL USE ONLY",
    tone: "confidential" as const,
    color: "#DC2626",
    rotation: -10,
  },
  {
    id: "rejected",
    text: "REJECTED",
    subtitle: "NON-COMPLIANT",
    tone: "rejected" as const,
    color: "#DC2626",
    rotation: -12,
  },
  {
    id: "draft",
    text: "DRAFT REVIEW",
    subtitle: "NOT FOR PRODUCTION",
    tone: "warning" as const,
    color: "#D97706",
    rotation: 0,
  },
];

export const CanvaPdfEditor: React.FC<CanvaPdfEditorProps> = ({
  file,
  onSave,
  onCancel,
}) => {
  // Navigation & Zoom
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(true);
  const [renderingError, setRenderingError] = useState<string | null>(null);

  // Active Tool Mode
  const [activeTool, setActiveTool] = useState<ToolMode>("select");

  // Selection & Active Edit state
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [activeEditingSpanId, setActiveEditingSpanId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>("");

  // Styling state for typography toolbar
  const [activeFontFamily, setActiveFontFamily] = useState<LiveFontFamily>("Helvetica");
  const [activeFontSize, setActiveFontSize] = useState<number>(12);
  const [activeIsBold, setActiveIsBold] = useState<boolean>(false);
  const [activeIsItalic, setActiveIsItalic] = useState<boolean>(false);
  const [activeTextColor, setActiveTextColor] = useState<string>("#000000");

  // Stamp selection
  const [selectedStampPreset, setSelectedStampPreset] = useState(STAMP_PRESETS[0]);

  // Highlight color
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(HIGHLIGHT_COLORS[0].hex);

  // Modifications State across all pages
  const [edits, setEdits] = useState<LivePdfEdits>({
    textEdits: [],
    addedTexts: [],
    whiteouts: [],
    highlights: [],
    stamps: [],
  });

  // Undo / Redo history
  const [history, setHistory] = useState<LivePdfEdits[]>([
    { textEdits: [], addedTexts: [], whiteouts: [], highlights: [], stamps: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active page's extracted text spans
  const [pageTextSpans, setPageTextSpans] = useState<ExtractedTextSpan[]>([]);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });

  // Drag creation state for whiteout / highlight
  const [isDrawingShape, setIsDrawingShape] = useState<boolean>(false);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrentPoint, setDragCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  // UI Panels
  const [showLayersSidebar, setShowLayersSidebar] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; message: string } | null>(
    null
  );

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<any>(null);

  // Count total modifications
  const totalModificationsCount =
    edits.textEdits.length +
    edits.addedTexts.length +
    edits.whiteouts.length +
    edits.highlights.length +
    (edits.stamps?.length || 0);

  // Helper: push state to history
  const pushToHistory = useCallback(
    (newEdits: LivePdfEdits) => {
      setEdits(newEdits);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newEdits];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setEdits(history[newIdx]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setEdits(history[newIdx]);
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Escape") {
        setActiveEditingSpanId(null);
        setSelectedSpanId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Load PDF Document instance
  useEffect(() => {
    let isMounted = true;
    async function loadDocument() {
      setIsRenderingPage(true);
      setRenderingError(null);
      try {
        const { loadPdfJs } = await import("@/lib/pdf-tools/common/pdfjs-loader");
        const pdfjs = await loadPdfJs();
        const buffer = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
        }).promise;

        if (!isMounted) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err: any) {
        console.error("Failed to load PDF in Canva editor:", err);
        if (isMounted) {
          setRenderingError(err?.message || "Failed to parse PDF document.");
        }
      } finally {
        if (isMounted) setIsRenderingPage(false);
      }
    }

    loadDocument();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render current page onto canvas & extract text spans
  useEffect(() => {
    let isCancelled = false;
    if (!pdfDocRef.current) return;

    async function renderPage() {
      setIsRenderingPage(true);
      setRenderingError(null);
      try {
        const doc = pdfDocRef.current;
        const page = await doc.getPage(currentPage);
        if (isCancelled) return;

        // Viewport scale (combines screen scale + user zoom)
        const dpr = typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 1.5) : 1.5;
        const baseViewport = page.getViewport({ scale: zoomScale });
        const renderViewport = page.getViewport({ scale: zoomScale * dpr });

        setPageDimensions({
          width: baseViewport.width,
          height: baseViewport.height,
        });

        // 1. Render to HTML5 Canvas
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = renderViewport.width;
          canvas.height = renderViewport.height;
          canvas.style.width = `${baseViewport.width}px`;
          canvas.style.height = `${baseViewport.height}px`;

          const ctx = canvas.getContext("2d", { alpha: false });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            const renderContext = {
              canvasContext: ctx,
              viewport: renderViewport,
            };
            await page.render(renderContext).promise;
          }
        }

        if (isCancelled) return;

        // 2. Extract Text Content & Coordinates
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        const spans: ExtractedTextSpan[] = [];

        textContent.items.forEach((item: any, idx: number) => {
          if (!("str" in item) || !item.str.trim()) return;

          const str = item.str;
          const transform = item.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
          const fontName = item.fontName || "";
          const style = textContent.styles?.[fontName];

          // Font family detection
          let detectedFamily: LiveFontFamily = "Helvetica";
          const famLower = (style?.fontFamily || fontName).toLowerCase();
          if (
            famLower.includes("times") ||
            famLower.includes("serif") ||
            famLower.includes("roman") ||
            famLower.includes("georgia")
          ) {
            detectedFamily = "TimesRoman";
          } else if (
            famLower.includes("courier") ||
            famLower.includes("mono") ||
            famLower.includes("consolas") ||
            famLower.includes("code")
          ) {
            detectedFamily = "Courier";
          }

          // Bold & Italic detection
          const detectedBold =
            famLower.includes("bold") ||
            famLower.includes("heavy") ||
            famLower.includes("black") ||
            famLower.includes("700") ||
            famLower.includes("800") ||
            famLower.includes("900");

          const detectedItalic =
            famLower.includes("italic") ||
            famLower.includes("oblique") ||
            famLower.includes("slanted");

          // Font size calculation in PDF points
          const fontSize =
            Math.hypot(transform[2], transform[3]) ||
            Math.abs(transform[3]) ||
            item.height ||
            12;

          // Convert PDF points (origin bottom-left) to base viewport (origin top-left)
          const [vx, vy] = baseViewport.convertToViewportPoint(transform[4], transform[5]);
          const vWidth = Math.max(item.width * zoomScale, fontSize * zoomScale * 0.5);
          const vHeight = fontSize * zoomScale * 1.15;
          const boxTop = vy - fontSize * zoomScale * 0.88;

          spans.push({
            id: `page-${currentPage}-span-${idx}`,
            str,
            dir: item.dir,
            width: item.width,
            height: fontSize,
            transform,
            fontName,
            detectedFamily,
            detectedBold,
            detectedItalic,
            fontSize,
            vx,
            vy: boxTop,
            vWidth,
            vHeight,
          });
        });

        if (!isCancelled) {
          setPageTextSpans(spans);
        }
      } catch (err: any) {
        console.error(`Error rendering page ${currentPage}:`, err);
        if (!isCancelled) {
          setRenderingError(err?.message || "Failed to render page.");
        }
      } finally {
        if (!isCancelled) setIsRenderingPage(false);
      }
    }

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [currentPage, zoomScale]);

  // Handle clicking on an existing text span to edit in place
  const handleSpanClick = (span: ExtractedTextSpan) => {
    setSelectedSpanId(span.id);
    setActiveEditingSpanId(span.id);

    // Check if span already has an active replacement
    const existingEdit = edits.textEdits.find(
      (e) => e.pageIndex === currentPage - 1 && e.id === span.id
    );

    const currentText = existingEdit ? existingEdit.newStr : span.str;
    setEditingTextValue(currentText);

    // Update typography controls with the span's detected styling
    setActiveFontFamily(existingEdit?.fontFamily || span.detectedFamily);
    setActiveFontSize(Math.round(existingEdit?.fontSize || span.fontSize));
    setActiveIsBold(existingEdit ? existingEdit.isBold : span.detectedBold);
    setActiveIsItalic(existingEdit ? existingEdit.isItalic : span.detectedItalic);
    setActiveTextColor(existingEdit?.color || "#000000");

    // Focus input after render
    setTimeout(() => {
      inlineInputRef.current?.focus();
      inlineInputRef.current?.select();
    }, 50);
  };

  // Commit text replacement into edits
  const handleCommitSpanEdit = (span: ExtractedTextSpan, newText: string) => {
    const trimmed = newText.trim();
    const pageIdx = currentPage - 1;

    // If text is unchanged from original, remove any custom edit
    if (trimmed === span.str) {
      const filtered = edits.textEdits.filter(
        (e) => !(e.pageIndex === pageIdx && e.id === span.id)
      );
      pushToHistory({ ...edits, textEdits: filtered });
      setActiveEditingSpanId(null);
      return;
    }

    // Otherwise create or update the replacement
    const updatedEdit: LiveTextSpanEdit = {
      id: span.id,
      pageIndex: pageIdx,
      originalStr: span.str,
      newStr: newText,
      x: span.transform[4],
      y: span.transform[5],
      width: span.width,
      height: span.height,
      fontSize: activeFontSize,
      fontFamily: activeFontFamily,
      isBold: activeIsBold,
      isItalic: activeIsItalic,
      color: activeTextColor,
      backgroundColor: "#FFFFFF",
    };

    const remaining = edits.textEdits.filter(
      (e) => !(e.pageIndex === pageIdx && e.id === span.id)
    );

    pushToHistory({
      ...edits,
      textEdits: [...remaining, updatedEdit],
    });

    setActiveEditingSpanId(null);
  };

  // Revert a single text span edit back to original
  const handleRevertSpanEdit = (spanId: string) => {
    const pageIdx = currentPage - 1;
    const filtered = edits.textEdits.filter(
      (e) => !(e.pageIndex === pageIdx && e.id === spanId)
    );
    pushToHistory({ ...edits, textEdits: filtered });
    if (activeEditingSpanId === spanId) setActiveEditingSpanId(null);
    if (selectedSpanId === spanId) setSelectedSpanId(null);
  };

  // Overlay pointer down (for adding text, whiteout, highlight, or stamp)
  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "add-text") {
      // Convert viewport (x, y) to PDF point coordinates
      const pdfX = x / zoomScale;
      const pdfY = (pageDimensions.height - y) / zoomScale;

      const newAddedText: LiveAddedText = {
        id: `added-${Date.now()}`,
        pageIndex: currentPage - 1,
        text: "New Text",
        x: pdfX,
        y: pdfY,
        fontSize: activeFontSize || 14,
        fontFamily: activeFontFamily,
        isBold: activeIsBold,
        isItalic: activeIsItalic,
        color: activeTextColor,
      };

      pushToHistory({
        ...edits,
        addedTexts: [...edits.addedTexts, newAddedText],
      });
      setActiveTool("select");
      return;
    }

    if (activeTool === "stamp") {
      const pdfX = x / zoomScale;
      const pdfY = (pageDimensions.height - y) / zoomScale;

      const newStamp: LiveStampPlacement = {
        id: `stamp-${Date.now()}`,
        pageIndex: currentPage - 1,
        text: selectedStampPreset.text,
        subtitle: selectedStampPreset.subtitle,
        x: pdfX,
        y: pdfY,
        tone: selectedStampPreset.tone,
        rotation: selectedStampPreset.rotation,
      };

      pushToHistory({
        ...edits,
        stamps: [...(edits.stamps || []), newStamp],
      });
      setActiveTool("select");
      return;
    }

    if (activeTool === "whiteout" || activeTool === "highlight") {
      setIsDrawingShape(true);
      setDragStartPoint({ x, y });
      setDragCurrentPoint({ x, y });
    }
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingShape || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(pageDimensions.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(pageDimensions.height, e.clientY - rect.top));
    setDragCurrentPoint({ x, y });
  };

  const handleOverlayPointerUp = () => {
    if (!isDrawingShape || !dragStartPoint || !dragCurrentPoint) {
      setIsDrawingShape(false);
      setDragStartPoint(null);
      setDragCurrentPoint(null);
      return;
    }

    const minX = Math.min(dragStartPoint.x, dragCurrentPoint.x);
    const minY = Math.min(dragStartPoint.y, dragCurrentPoint.y);
    const w = Math.abs(dragCurrentPoint.x - dragStartPoint.x);
    const h = Math.abs(dragCurrentPoint.y - dragStartPoint.y);

    // Only create if drag was meaningful (> 4px)
    if (w > 4 && h > 4) {
      const pdfX = minX / zoomScale;
      const pdfY = (pageDimensions.height - (minY + h)) / zoomScale;
      const pdfW = w / zoomScale;
      const pdfH = h / zoomScale;

      if (activeTool === "whiteout") {
        const newWhiteout: LiveWhiteout = {
          id: `whiteout-${Date.now()}`,
          pageIndex: currentPage - 1,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: "#FFFFFF",
        };
        pushToHistory({
          ...edits,
          whiteouts: [...edits.whiteouts, newWhiteout],
        });
      } else if (activeTool === "highlight") {
        const newHighlight: LiveHighlight = {
          id: `highlight-${Date.now()}`,
          pageIndex: currentPage - 1,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: selectedHighlightColor,
          opacity: 0.45,
        };
        pushToHistory({
          ...edits,
          highlights: [...edits.highlights, newHighlight],
        });
      }
    }

    setIsDrawingShape(false);
    setDragStartPoint(null);
    setDragCurrentPoint(null);
  };

  // Save & Download Action
  const handleSaveAndDownload = async () => {
    setIsExporting(true);
    setExportProgress({ percent: 10, message: "Preparing Canva live document rendering..." });

    try {
      const result = await applyLivePdfEdits(file, edits, {
        onProgress: (percent, message) => {
          setExportProgress({ percent, message });
        },
      });

      if (onSave) {
        onSave(result);
      } else {
        // Direct browser download
        const blob = new Blob([result.pdfBytes as any], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      alert(`Export failed: ${err?.message || "Unknown error occurred"}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const currentPageEdits = edits.textEdits.filter((e) => e.pageIndex === currentPage - 1);
  const currentPageAddedTexts = edits.addedTexts.filter((e) => e.pageIndex === currentPage - 1);
  const currentPageWhiteouts = edits.whiteouts.filter((e) => e.pageIndex === currentPage - 1);
  const currentPageHighlights = edits.highlights.filter((e) => e.pageIndex === currentPage - 1);
  const currentPageStamps = (edits.stamps || []).filter((e) => e.pageIndex === currentPage - 1);

  return (
    <div className="w-full flex flex-col rounded-3xl bg-zinc-950 text-white border border-zinc-800 shadow-2xl overflow-hidden select-none">
      {/* TOP HEADER: Canva Studio Bar */}
      <div className="w-full px-5 py-3.5 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Canva PDF Live Studio
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                In-Memory Client Engine
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Click any word to change it directly with its matching font and styling
            </p>
          </div>
        </div>

        {/* Center: Undo / Redo & Mode Tools */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-2xl border border-zinc-800/80">
          <button
            type="button"
            disabled={historyIndex === 0}
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo (Ctrl+Z)"
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo (Ctrl+Y)"
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-zinc-800 mx-1" />

          {/* Tool Modes */}
          <button
            type="button"
            onClick={() => {
              setActiveTool("select");
              setActiveEditingSpanId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTool === "select"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select & Edit Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("add-text")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTool === "add-text"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>+ Add Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("whiteout")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTool === "whiteout"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Whiteout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("highlight")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTool === "highlight"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Highlight</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("stamp")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTool === "stamp"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>Stamps</span>
          </button>
        </div>

        {/* Right: Layers Drawer Toggle & Save & Download */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLayersSidebar(!showLayersSidebar)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showLayersSidebar
                ? "bg-zinc-800 text-white border-zinc-700"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Edits ({totalModificationsCount})</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={isExporting}
            onClick={handleSaveAndDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save & Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECONDARY TOOLBAR: Typography & Active Tool Properties */}
      <div className="w-full px-5 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Dynamic controls according to active tool */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTool === "select" || activeTool === "add-text" ? (
            <>
              {/* Font Family Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-zinc-400">Font:</span>
                <select
                  value={activeFontFamily}
                  onChange={(e) => setActiveFontFamily(e.target.value as LiveFontFamily)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="Helvetica">Helvetica (Sans-Serif)</option>
                  <option value="TimesRoman">Times Roman (Serif)</option>
                  <option value="Courier">Courier (Monospace)</option>
                </select>
              </div>

              {/* Font Size Stepper */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFontSize((s) => Math.max(6, s - 1))}
                  aria-label="Decrease font size"
                  className="px-2 py-0.5 hover:bg-zinc-800 rounded-md text-zinc-300 font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="px-2 text-xs font-semibold text-white">{activeFontSize} pt</span>
                <button
                  type="button"
                  onClick={() => setActiveFontSize((s) => Math.min(72, s + 1))}
                  aria-label="Increase font size"
                  className="px-2 py-0.5 hover:bg-zinc-800 rounded-md text-zinc-300 font-bold cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Bold & Italic Toggles */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveIsBold(!activeIsBold)}
                  className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                    activeIsBold
                      ? "bg-purple-600/30 border-purple-500 text-purple-200"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  title="Bold"
                  aria-label="Toggle Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIsItalic(!activeIsItalic)}
                  className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                    activeIsItalic
                      ? "bg-purple-600/30 border-purple-500 text-purple-200"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  title="Italic"
                  aria-label="Toggle Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400">Color:</span>
                <div className="flex items-center gap-1">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setActiveTextColor(c.hex)}
                      title={c.label}
                      aria-label={`Select color ${c.label}`}
                      style={{ backgroundColor: c.hex }}
                      className={`w-4 h-4 rounded-full border cursor-pointer transition-transform ${
                        activeTextColor.toLowerCase() === c.hex.toLowerCase()
                          ? "scale-125 border-white ring-2 ring-purple-500"
                          : "border-zinc-700 hover:scale-110"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : activeTool === "highlight" ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400">Marker Color:</span>
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((hc) => (
                  <button
                    key={hc.hex}
                    type="button"
                    onClick={() => setSelectedHighlightColor(hc.hex)}
                    style={{ backgroundColor: hc.hex }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-zinc-900 border cursor-pointer transition-all ${
                      selectedHighlightColor === hc.hex
                        ? "border-zinc-900 ring-2 ring-white scale-105"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    {hc.label}
                  </button>
                ))}
              </div>
            </div>
          ) : activeTool === "stamp" ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400">Stamp Preset:</span>
              <div className="flex items-center gap-1.5">
                {STAMP_PRESETS.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setSelectedStampPreset(sp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      selectedStampPreset.id === sp.id
                        ? "bg-purple-600 text-white border-purple-400 ring-1 ring-purple-400"
                        : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {sp.text}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-zinc-400 italic ml-2">Click page to stamp</span>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Eraser className="w-3.5 h-3.5 text-zinc-500" />
              <span>Click and drag over any area on the page to create an opaque whiteout mask.</span>
            </div>
          )}
        </div>

        {/* Right: Quick Action hints */}
        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
          {activeEditingSpanId ? (
            <span className="text-purple-300 font-semibold animate-pulse">
              Press Enter to confirm edit • Esc to cancel
            </span>
          ) : (
            <span>Tip: Drag to highlight or whiteout • Double-click added text to edit</span>
          )}
        </div>
      </div>

      {/* MAIN WORKSPACE: Document Viewer & Interactive Canvas */}
      <div className="relative flex-1 min-h-[560px] max-h-[800px] overflow-auto flex bg-zinc-950 p-6 items-center justify-center">
        {isRenderingPage && (
          <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-30 gap-2">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <span className="text-xs font-semibold text-zinc-300">
              Rendering Page {currentPage} at high fidelity...
            </span>
          </div>
        )}

        {renderingError && (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center max-w-md">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-red-200">Failed to render page</h4>
            <p className="text-xs text-red-300/80 mt-1">{renderingError}</p>
          </div>
        )}

        {/* Centered Document Paper Container */}
        <div
          className="relative bg-white shadow-2xl rounded-xs overflow-hidden select-none transition-shadow"
          style={{
            width: `${pageDimensions.width}px`,
            height: `${pageDimensions.height}px`,
          }}
        >
          {/* Layer 1: HTML5 Canvas rendered via PDF.js */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none block"
            style={{ width: "100%", height: "100%" }}
          />

          {/* Layer 2: Whiteout Masks */}
          {currentPageWhiteouts.map((w) => {
            const vx = w.x * zoomScale;
            const vy = (pageDimensions.height / zoomScale - (w.y + w.height)) * zoomScale;
            const vw = w.width * zoomScale;
            const vh = w.height * zoomScale;

            return (
              <div
                key={w.id}
                className="absolute bg-white group border border-dashed border-zinc-300/40 hover:border-red-400 transition-colors pointer-events-auto"
                style={{
                  left: `${vx}px`,
                  top: `${vy}px`,
                  width: `${vw}px`,
                  height: `${vh}px`,
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pushToHistory({
                      ...edits,
                      whiteouts: edits.whiteouts.filter((item) => item.id !== w.id),
                    });
                  }}
                  className="hidden group-hover:flex absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white items-center justify-center text-[10px] shadow-md cursor-pointer"
                  title="Remove whiteout"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Layer 3: Highlights */}
          {currentPageHighlights.map((h) => {
            const vx = h.x * zoomScale;
            const vy = (pageDimensions.height / zoomScale - (h.y + h.height)) * zoomScale;
            const vw = h.width * zoomScale;
            const vh = h.height * zoomScale;

            return (
              <div
                key={h.id}
                className="absolute group border border-transparent hover:border-zinc-800 transition-colors pointer-events-auto"
                style={{
                  left: `${vx}px`,
                  top: `${vy}px`,
                  width: `${vw}px`,
                  height: `${vh}px`,
                  backgroundColor: h.color || "#FEF08A",
                  opacity: h.opacity ?? 0.45,
                  mixBlendMode: "multiply",
                  zIndex: 11,
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pushToHistory({
                      ...edits,
                      highlights: edits.highlights.filter((item) => item.id !== h.id),
                    });
                  }}
                  className="hidden group-hover:flex absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-zinc-900 text-white items-center justify-center text-[10px] shadow-md cursor-pointer"
                  title="Remove highlight"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Layer 4: Replaced In-Place Text Spans */}
          {currentPageEdits.map((edit) => {
            // Find corresponding extracted span for viewport position
            const span = pageTextSpans.find((s) => s.id === edit.id);
            if (!span) return null;

            return (
              <div
                key={edit.id}
                onClick={() => handleSpanClick(span)}
                className="absolute bg-white px-0.5 border border-purple-500/80 rounded-xs shadow-xs text-zinc-900 flex items-center group cursor-text pointer-events-auto"
                style={{
                  left: `${span.vx}px`,
                  top: `${span.vy}px`,
                  minWidth: `${span.vWidth}px`,
                  height: `${span.vHeight}px`,
                  fontSize: `${edit.fontSize * zoomScale}px`,
                  fontFamily:
                    edit.fontFamily === "TimesRoman"
                      ? '"Times New Roman", Times, serif'
                      : edit.fontFamily === "Courier"
                      ? '"Courier New", Courier, monospace'
                      : 'Inter, Arial, Helvetica, sans-serif',
                  fontWeight: edit.isBold ? "bold" : "normal",
                  fontStyle: edit.isItalic ? "italic" : "normal",
                  color: edit.color || "#000000",
                  zIndex: 15,
                }}
              >
                <span className="leading-none whitespace-pre select-text">{edit.newStr}</span>

                {/* Subtle indicator tag */}
                <div className="hidden group-hover:flex items-center gap-1 absolute -top-5 left-0 px-1.5 py-0.5 rounded-sm bg-purple-900 text-purple-200 text-[9px] font-bold shadow-md z-30">
                  <span>Edited</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevertSpanEdit(edit.id);
                    }}
                    title="Revert to original"
                    className="hover:text-white cursor-pointer ml-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Layer 5: Added Text Boxes */}
          {currentPageAddedTexts.map((at) => {
            const vx = at.x * zoomScale;
            const vy = (pageDimensions.height / zoomScale - at.y) * zoomScale;

            return (
              <div
                key={at.id}
                className="absolute group border border-dashed border-purple-400 hover:border-purple-600 bg-white/90 px-1 py-0.5 rounded-xs shadow-xs cursor-move pointer-events-auto"
                style={{
                  left: `${vx}px`,
                  top: `${vy}px`,
                  fontSize: `${at.fontSize * zoomScale}px`,
                  fontFamily:
                    at.fontFamily === "TimesRoman"
                      ? '"Times New Roman", Times, serif'
                      : at.fontFamily === "Courier"
                      ? '"Courier New", Courier, monospace'
                      : 'Inter, Arial, Helvetica, sans-serif',
                  fontWeight: at.isBold ? "bold" : "normal",
                  fontStyle: at.isItalic ? "italic" : "normal",
                  color: at.color || "#000000",
                  zIndex: 16,
                }}
              >
                <span>{at.text}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pushToHistory({
                      ...edits,
                      addedTexts: edits.addedTexts.filter((item) => item.id !== at.id),
                    });
                  }}
                  className="hidden group-hover:flex absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white items-center justify-center text-[10px] shadow-md cursor-pointer"
                  title="Delete text box"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Layer 6: Stamps */}
          {currentPageStamps.map((st) => {
            const vx = st.x * zoomScale;
            const vy = (pageDimensions.height / zoomScale - st.y) * zoomScale;

            const isRed = st.tone === "rejected" || st.tone === "confidential";
            const borderColor = isRed ? "#DC2626" : "#059669";

            return (
              <div
                key={st.id}
                className="absolute group px-3 py-1.5 rounded-sm bg-white/95 border-2 shadow-lg flex flex-col items-center justify-center pointer-events-auto"
                style={{
                  left: `${vx}px`,
                  top: `${vy}px`,
                  borderColor,
                  color: borderColor,
                  transform: `rotate(${st.rotation}deg)`,
                  zIndex: 17,
                }}
              >
                <span className="text-xs font-black tracking-wider">{st.text}</span>
                {st.subtitle && (
                  <span className="text-[8px] font-bold tracking-tight opacity-85">
                    {st.subtitle}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pushToHistory({
                      ...edits,
                      stamps: (edits.stamps || []).filter((item) => item.id !== st.id),
                    });
                  }}
                  className="hidden group-hover:flex absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 text-white items-center justify-center text-[8px] shadow-md cursor-pointer"
                  title="Remove stamp"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}

          {/* Layer 7: Interactive Hitbox Overlays for Existing Text (In "Select & Edit" mode) */}
          {activeTool === "select" &&
            pageTextSpans.map((span) => {
              const isEdited = edits.textEdits.some(
                (e) => e.pageIndex === currentPage - 1 && e.id === span.id
              );
              if (isEdited) return null; // already rendered in Layer 4

              const isEditing = activeEditingSpanId === span.id;

              if (isEditing) {
                // Active inline input overlay
                return (
                  <div
                    key={`editing-${span.id}`}
                    className="absolute z-30 bg-white shadow-xl rounded-xs ring-2 ring-purple-600 p-0.5"
                    style={{
                      left: `${span.vx - 2}px`,
                      top: `${span.vy - 2}px`,
                      minWidth: `${Math.max(span.vWidth + 20, 100)}px`,
                      height: `${span.vHeight + 6}px`,
                    }}
                  >
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={editingTextValue}
                      onChange={(e) => setEditingTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCommitSpanEdit(span, editingTextValue);
                        } else if (e.key === "Escape") {
                          setActiveEditingSpanId(null);
                        }
                      }}
                      onBlur={() => {
                        handleCommitSpanEdit(span, editingTextValue);
                      }}
                      className="w-full h-full px-1 bg-transparent text-zinc-950 outline-hidden font-inherit border-none"
                      style={{
                        fontSize: `${activeFontSize * zoomScale}px`,
                        fontFamily:
                          activeFontFamily === "TimesRoman"
                            ? '"Times New Roman", Times, serif'
                            : activeFontFamily === "Courier"
                            ? '"Courier New", Courier, monospace'
                            : 'Inter, Arial, Helvetica, sans-serif',
                        fontWeight: activeIsBold ? "bold" : "normal",
                        fontStyle: activeIsItalic ? "italic" : "normal",
                        color: activeTextColor,
                      }}
                    />
                  </div>
                );
              }

              // Normal text hitbox
              return (
                <div
                  key={span.id}
                  onClick={() => handleSpanClick(span)}
                  title={`Click to edit: "${span.str}"`}
                  className="absolute cursor-text hover:bg-purple-500/15 hover:border hover:border-purple-500/60 rounded-xs transition-colors pointer-events-auto"
                  style={{
                    left: `${span.vx}px`,
                    top: `${span.vy}px`,
                    width: `${span.vWidth}px`,
                    height: `${span.vHeight}px`,
                    zIndex: 12,
                  }}
                />
              );
            })}

          {/* Layer 8: Drawing drag preview rectangle */}
          {isDrawingShape && dragStartPoint && dragCurrentPoint && (
            <div
              className={`absolute border-2 pointer-events-none z-25 ${
                activeTool === "whiteout"
                  ? "bg-white/80 border-dashed border-red-500"
                  : "bg-amber-300/40 border-dashed border-amber-600"
              }`}
              style={{
                left: `${Math.min(dragStartPoint.x, dragCurrentPoint.x)}px`,
                top: `${Math.min(dragStartPoint.y, dragCurrentPoint.y)}px`,
                width: `${Math.abs(dragCurrentPoint.x - dragStartPoint.x)}px`,
                height: `${Math.abs(dragCurrentPoint.y - dragStartPoint.y)}px`,
              }}
            />
          )}

          {/* Layer 9: Global click & drag capture overlay */}
          <div
            ref={overlayRef}
            onPointerDown={handleOverlayPointerDown}
            onPointerMove={handleOverlayPointerMove}
            onPointerUp={handleOverlayPointerUp}
            className={`absolute inset-0 z-20 ${
              activeTool === "whiteout" || activeTool === "highlight"
                ? "cursor-crosshair"
                : activeTool === "add-text" || activeTool === "stamp"
                ? "cursor-cell"
                : "cursor-default"
            }`}
          />
        </div>

        {/* Collapsible Modifications History Drawer (Right sidebar) */}
        {showLayersSidebar && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl p-4 flex flex-col z-40 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Modifications ({totalModificationsCount})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLayersSidebar(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 py-3 space-y-2 text-xs">
              {totalModificationsCount === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No modifications yet</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Click any word on the PDF to replace it, or draw whiteouts and highlights.
                  </p>
                </div>
              ) : (
                <>
                  {/* Text Edits */}
                  {edits.textEdits.map((te) => (
                    <div
                      key={te.id}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-purple-500/50 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300">
                            P.{te.pageIndex + 1} Text Edit
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 line-through mt-1 truncate max-w-[190px]">
                          {te.originalStr}
                        </p>
                        <p className="text-xs font-semibold text-emerald-400 truncate max-w-[190px]">
                          {te.newStr}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          pushToHistory({
                            ...edits,
                            textEdits: edits.textEdits.filter((item) => item.id !== te.id),
                          });
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Revert edit"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Added Texts */}
                  {edits.addedTexts.map((at) => (
                    <div
                      key={at.id}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300">
                          P.{at.pageIndex + 1} Added Text
                        </span>
                        <p className="text-xs font-medium text-white mt-1 truncate max-w-[190px]">
                          {at.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          pushToHistory({
                            ...edits,
                            addedTexts: edits.addedTexts.filter((item) => item.id !== at.id),
                          });
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Delete text box"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Whiteouts */}
                  {edits.whiteouts.map((w, idx) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                        P.{w.pageIndex + 1} Whiteout #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          pushToHistory({
                            ...edits,
                            whiteouts: edits.whiteouts.filter((item) => item.id !== w.id),
                          });
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Remove whiteout"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Highlights */}
                  {edits.highlights.map((h, idx) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                        P.{h.pageIndex + 1} Highlight #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          pushToHistory({
                            ...edits,
                            highlights: edits.highlights.filter((item) => item.id !== h.id),
                          });
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Remove highlight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {totalModificationsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Clear all active modifications across all pages?")) {
                    pushToHistory({
                      textEdits: [],
                      addedTexts: [],
                      whiteouts: [],
                      highlights: [],
                      stamps: [],
                    });
                  }
                }}
                className="w-full py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 border border-red-500/20 transition-colors cursor-pointer"
              >
                Clear All Modifications
              </button>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM DOCK: Navigation & Zoom Controls */}
      <div className="w-full px-5 py-3 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Page Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1 || isRenderingPage}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer transition-colors"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= totalPages) setCurrentPage(val);
              }}
              aria-label="Current page number"
              className="w-12 text-center py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-white font-bold text-xs focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            />
            <span>of {totalPages}</span>
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || isRenderingPage}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer transition-colors"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Modifications Summary */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {totalModificationsCount === 0
              ? "Ready to edit • Zero server upload"
              : `${totalModificationsCount} modification(s) active across ${totalPages} page(s)`}
          </span>
        </div>

        {/* Right: Zoom Stepper */}
        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
          <button
            type="button"
            disabled={zoomScale <= 0.75}
            onClick={() => setZoomScale((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-semibold text-white">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            disabled={zoomScale >= 2.5}
            onClick={() => setZoomScale((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomScale(1.25)}
            className="px-2 py-1 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
            title="Reset Zoom"
            aria-label="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* EXPORT OVERLAY SPINNER */}
      {isExporting && exportProgress && (
        <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6">
          <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl max-w-sm w-full flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Saving Canva Live Edits...
            </h3>
            <p className="text-xs text-zinc-400 mb-4">{exportProgress.message}</p>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-zinc-500 mt-2">
              {exportProgress.percent}% • Client-Side RAM
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
