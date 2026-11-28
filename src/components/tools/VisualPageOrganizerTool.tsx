"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  Layers,
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Undo2,
  ZoomIn,
  Download,
  FileText,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Smartphone,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { CustomFileNameInput, computeEffectiveFileName } from "@/components/CustomFileNameInput";
import { organizePdfPages, type PageOrganizeItem } from "@/lib/pdf-tools/organize/organize-pages";
import { setChainedDocument, getChainedDocument } from "@/lib/pdf-tools/chained-document";
import { ensureValidPdfFile } from "@/lib/pdf-tools/common/safe-pdf-loader";

export interface VisualPageItem {
  id: string; // unique item id
  origIndex: number; // 0-based original page index, or -1 for blank
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl: string | null;
  isBlank?: boolean;
}

interface VisualPageOrganizerToolProps {
  initialFile?: File | null;
  isPro?: boolean;
  onOpenPricing?: () => void;
  onChainTool?: (toolId: string) => void;
}

export function VisualPageOrganizerTool({
  initialFile = null,
  isPro = false,
  onOpenPricing,
  onChainTool,
}: VisualPageOrganizerToolProps) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [pages, setPages] = useState<VisualPageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultFileName, setResultFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [previewZoomPage, setPreviewZoomPage] = useState<VisualPageItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and render page thumbnails from PDF via pdfjs-dist
  const loadThumbnails = useCallback(async (targetFile: File) => {
    setIsLoadingThumbnails(true);
    setError(null);
    setResultBytes(null);
    setPages([]);
    setSelectedIds(new Set());

    try {
      const cleanFile = await ensureValidPdfFile(targetFile);
      setFile(cleanFile);

      const pdfjs = await import("pdfjs-dist");
      // Use local pre-cached worker from public directory for 100% offline support
      if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }

      const buffer = await cleanFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/",
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      setRenderProgress({ current: 0, total: numPages });

      const initialPages: VisualPageItem[] = [];
      for (let i = 1; i <= numPages; i++) {
        initialPages.push({
          id: `page-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          origIndex: i - 1,
          rotation: 0,
          thumbnailUrl: null,
        });
      }
      setPages(initialPages);

      // Render thumbnail canvases sequentially or in lightweight microtasks
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.35 }); // Lightweight preview thumbnail
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (ctx) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx as any, viewport } as any).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

            setPages((prev) =>
              prev.map((p, idx) => (idx === i - 1 ? { ...p, thumbnailUrl: dataUrl } : p))
            );
          }
        } catch (e) {
          console.warn(`[VisualOrganizer] Thumbnail error on page ${i}:`, e);
        }
        setRenderProgress({ current: i, total: numPages });
      }

      setCustomFileName(cleanFile.name.replace(/\.[^/.]+$/, "") + "_organized");
    } catch (err: any) {
      console.error("[VisualOrganizer] Failed to load PDF:", err);
      setError(err?.message || "Failed to render document pages. Please try another file.");
    } finally {
      setIsLoadingThumbnails(false);
      setRenderProgress(null);
    }
  }, []);

  // When initial file changes or drops, or when chained from phone transfer
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      loadThumbnails(initialFile);
    } else {
      const chained = getChainedDocument();
      if (chained) {
        setFile(chained);
        loadThumbnails(chained);
      }
    }

    const handleFileReceived = async (e: any) => {
      const f = e.detail?.file;
      if (f) {
        try {
          const clean = await ensureValidPdfFile(f);
          setFile(clean);
          loadThumbnails(clean);
        } catch (err: any) {
          setError(err?.message || "Received file is not a supported PDF or image.");
        }
      }
    };
    window.addEventListener("docdrop:file-received", handleFileReceived);
    return () => window.removeEventListener("docdrop:file-received", handleFileReceived);
  }, [initialFile, loadThumbnails]);

  const handleFileSelect = async (selectedFile: File) => {
    try {
      const clean = await ensureValidPdfFile(selectedFile);
      setFile(clean);
      loadThumbnails(clean);
    } catch (err: any) {
      setError(err?.message || "Please drop or select a valid PDF or image file.");
    }
  };

  // Reorder pages in array
  const movePage = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= pages.length || toIdx >= pages.length) {
      return;
    }
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  // Rotate a single page +90 deg
  const rotatePageCW = (idx: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  // Rotate a single page -90 deg
  const rotatePageCCW = (idx: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, rotation: (p.rotation + 270) % 360 } : p))
    );
  };

  // Duplicate a page
  const duplicatePage = (idx: number) => {
    setPages((prev) => {
      const target = prev[idx];
      const dup: VisualPageItem = {
        ...target,
        id: `dup-${target.origIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  // Delete a page
  const deletePage = (idx: number) => {
    if (pages.length <= 1) {
      setError("The document must contain at least 1 page.");
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Insert a blank page
  const insertBlankPage = (afterIdx?: number) => {
    const insertPos = afterIdx !== undefined ? afterIdx + 1 : pages.length;
    const blank: VisualPageItem = {
      id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      origIndex: -1,
      rotation: 0,
      thumbnailUrl: null,
      isBlank: true,
    };
    setPages((prev) => {
      const next = [...prev];
      next.splice(insertPos, 0, blank);
      return next;
    });
  };

  // Batch selection toggles
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pages.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch actions on selected pages
  const rotateSelectedCW = () => {
    setPages((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const deleteSelected = () => {
    if (pages.length - selectedIds.size < 1) {
      setError("Cannot delete all pages. At least 1 page must remain.");
      return;
    }
    setPages((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
  };

  // Export organized PDF in client RAM
  const handleExport = async () => {
    if (!file || pages.length === 0) return;
    setIsExporting(true);
    setError(null);

    try {
      const items: PageOrganizeItem[] = pages.map((p) => ({
        pageIndex: p.origIndex,
        rotation: p.rotation,
        isBlank: p.isBlank,
      }));

      const res = await organizePdfPages(file, items);

      const defaultOutput = `${file.name.replace(/\.[^/.]+$/, "")}_organized.pdf`;
      const effectiveName = computeEffectiveFileName(defaultOutput, customFileName);
      const finalName = effectiveName.toLowerCase().endsWith(".pdf")
        ? effectiveName
        : `${effectiveName}.pdf`;

      setResultBytes(res.pdfBytes);
      setResultFileName(finalName);

      // Store in document chaining pipeline for instant chaining
      const organizedBlob = new Blob([res.pdfBytes as any], { type: "application/pdf" });
      const organizedFile = new File([organizedBlob], finalName, { type: "application/pdf" });
      setChainedDocument(organizedFile);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#f43f5e", "#fbbf24", "#10b981", "#6366f1"],
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error("[VisualOrganizer] Export error:", err);
      setError(err?.message || "Failed to assemble organized PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // Direct download trigger
  const handleDownload = () => {
    if (!resultBytes) return;
    const blob = new Blob([resultBytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultFileName || "docdrop_organized.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Tool Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-[var(--surface)]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">
                Visual Page Organizer
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                In-RAM Zero-Cloud
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Drag to reorder, rotate individual pages, insert blank pages, and delete unwanted sheets instantly.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {file && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Change PDF</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* Upload Zone (When No File Selected) */}
      {!file && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelect(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-rose-500/60 dark:hover:border-rose-400/60 bg-[var(--surface)]/60 hover:bg-rose-500/[0.02] transition-all cursor-pointer text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 group-hover:scale-105 transition-transform">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Drop your PDF document here
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
            Or click to browse from your device. Rendered directly in your browser's memory without uploading.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Private In-RAM Processing</span>
          </div>
        </div>
      )}

      {/* Main Workspace (When File Loaded) */}
      {file && (
        <div className="space-y-5">
          {/* Toolbar: Stats & Bulk Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface)]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800 shadow-2xs">
            {/* Left: Stats & Selection */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <span>Pages:</span>
                <span className="font-mono px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold">
                  {pages.length}
                </span>
              </span>

              {selectedIds.size > 0 && (
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 font-mono">
                  {selectedIds.size} selected
                </span>
              )}

              {isLoadingThumbnails && renderProgress && (
                <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                  Generating previews {renderProgress.current}/{renderProgress.total}...
                </span>
              )}
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={selectedIds.size === pages.length ? clearSelection : selectAll}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                title="Toggle select all pages"
              >
                {selectedIds.size === pages.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-rose-500" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-zinc-400" /> Select All
                  </>
                )}
              </button>

              {selectedIds.size > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={rotateSelectedCW}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                    title="Rotate selected pages 90° clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotate Selected
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                    title="Delete selected pages"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPages((prev) => [...prev].reverse())}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    title="Reverse entire sequence"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Reverse
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPages((prev) =>
                        prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    title="Rotate all pages +90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotate All
                  </button>
                  <button
                    type="button"
                    onClick={() => insertBlankPage()}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    title="Insert blank page at end"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-500" /> Insert Blank
                  </button>
                  <button
                    type="button"
                    onClick={() => loadThumbnails(file)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    title="Reset to original sequence"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive Drag-and-Drop Thumbnail Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 p-3 rounded-3xl bg-[var(--surface)]/70 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800 min-h-[300px] max-h-[620px] overflow-y-auto">
            {pages.map((page, idx) => {
              const isSelected = selectedIds.has(page.id);
              const isBeingDragged = draggedIndex === idx;

              return (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => setDraggedIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedIndex !== null && draggedIndex !== idx) {
                      movePage(draggedIndex, idx);
                    }
                    setDraggedIndex(null);
                  }}
                  className={`group relative flex flex-col justify-between p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing bg-white dark:bg-zinc-900 ${
                    isBeingDragged
                      ? "opacity-30 border-dashed border-rose-500 scale-95"
                      : isSelected
                      ? "border-rose-500 dark:border-rose-400 ring-2 ring-rose-500/20 shadow-xs"
                      : "border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-2xs"
                  }`}
                >
                  {/* Top Bar: Checkbox & Sequence Tag */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(page.id);
                      }}
                      className="cursor-pointer text-zinc-400 hover:text-rose-500 transition-colors p-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-mono font-bold text-zinc-950 dark:text-white tnum">
                        Page {idx + 1}
                      </span>
                      {page.rotation !== 0 && (
                        <span className="text-[10px] font-mono font-bold px-1 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                          +{page.rotation}°
                        </span>
                      )}
                      {page.isBlank && (
                        <span className="text-[10px] font-bold px-1 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                          Blank
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail Preview Image with Dynamic Rotation */}
                  <div
                    onClick={() => setPreviewZoomPage(page)}
                    className="aspect-[3/4] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center relative p-1.5 cursor-zoom-in"
                    title="Click to view full-page zoom"
                  >
                    {page.isBlank ? (
                      <div className="w-full h-full border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex flex-col items-center justify-center text-zinc-400 space-y-1">
                        <FileText className="w-6 h-6 opacity-40" />
                        <span className="text-[10px] font-mono uppercase">Blank Page</span>
                      </div>
                    ) : page.thumbnailUrl ? (
                      <img
                        src={page.thumbnailUrl}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-contain transition-transform duration-200 select-none pointer-events-none"
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                      />
                    ) : (
                      <div className="text-center space-y-1">
                        <RefreshCw className="w-4 h-4 text-rose-500/70 animate-spin mx-auto" />
                        <span className="text-[10px] font-mono text-zinc-400">Loading...</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl">
                      <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  </div>

                  {/* Action Controls Footer */}
                  <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    {/* Left/Right nudge */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, idx - 1);
                        }}
                        className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === pages.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, idx + 1);
                        }}
                        className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Rotate, Duplicate, Delete */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotatePageCW(idx);
                        }}
                        className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                        title="Rotate +90°"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicatePage(idx);
                        }}
                        className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                        title="Duplicate Page"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={pages.length <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(idx);
                        }}
                        className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Export & Custom File Name Card */}
          <div className="p-5 rounded-3xl bg-[var(--surface)]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800 shadow-2xs space-y-4">
            <div className="max-w-md">
              <CustomFileNameInput
                value={customFileName}
                onChange={setCustomFileName}
                defaultFileName={`${file.name.replace(/\.[^/.]+$/, "")}_organized.pdf`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-xs text-zinc-500">
                <span>Original: {file.name}</span>
                <span className="mx-2">•</span>
                <span>Ready to compile {pages.length} pages</span>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExport}
                className="px-6 py-3 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compiling In RAM...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Save &amp; Compile PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export Success Result Card */}
          {resultBytes && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-emerald-500/[0.06] border border-emerald-500/30 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                      Document Organized Successfully!
                    </h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {resultFileName} ({(resultBytes.length / (1024 * 1024)).toFixed(2)} MB, {pages.length} pages)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (resultBytes) {
                        const blob = new Blob([resultBytes as unknown as BlobPart], { type: "application/pdf" });
                        const fileObj = new File([blob], resultFileName, { type: "application/pdf" });
                        window.dispatchEvent(
                          new CustomEvent("docdrop:open-phone-transfer", { detail: { file: fileObj } })
                        );
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    title="Send organized PDF directly to your smartphone"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Send to Phone</span>
                  </button>
                </div>
              </div>

              {/* Chaining Shortcuts */}
              <div className="pt-3 border-t border-emerald-500/20 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                  Next Actions:
                </span>
                {[
                  { id: "compress-pdf", label: "Compress PDF" },
                  { id: "sign-pdf", label: "Sign PDF" },
                  { id: "protect-pdf", label: "Protect PDF" },
                  { id: "merge-pdf", label: "Merge PDF" },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => onChainTool && onChainTool(act.id)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{act.label}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Full-Page High-Res Zoom Modal */}
      <AnimatePresence>
        {previewZoomPage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={() => setPreviewZoomPage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center"
            >
              <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <span className="text-sm font-bold text-white font-mono">
                  Page Preview (Original #{previewZoomPage.origIndex + 1})
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoomPage(null)}
                  className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950 p-2">
                {previewZoomPage.thumbnailUrl ? (
                  <img
                    src={previewZoomPage.thumbnailUrl}
                    alt="Page Zoom"
                    className="max-h-[65vh] object-contain transition-transform"
                    style={{ transform: `rotate(${previewZoomPage.rotation}deg)` }}
                  />
                ) : (
                  <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                    Blank Page
                  </div>
                )}
              </div>

              <div className="w-full flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    const idx = pages.findIndex((p) => p.id === previewZoomPage.id);
                    if (idx !== -1) rotatePageCW(idx);
                    setPreviewZoomPage((prev) =>
                      prev ? { ...prev, rotation: (prev.rotation + 90) % 360 } : null
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotate +90°
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
