"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileText,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  CheckCircle2,
  RefreshCw,
  Layers,
  ShieldCheck,
  AlertCircle,
  GripVertical,
  RotateCw,
  Undo2,
  Sparkles,
  PenTool,
  Zap,
  Stamp,
  Lock,
  Smartphone,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { StepWorkflowTracker } from "@/components/StepWorkflowTracker";
import {
  mergePdfFiles,
  getPdfPageCount,
  type MergeFileItem,
  type MergeResult,
} from "@/lib/pdf-tools/merge-pdf";
import { createSamplePdfFile } from "@/lib/pdf-tools/sample-pdf";
import { loadPdfJs } from "@/lib/pdf-tools/common/pdfjs-loader";
import { useAuth } from "@/context/AuthContext";
import { FREE_TIER_LIMITS, PRO_TIER_LIMITS } from "@/lib/pricing-plans";
import { CustomFileNameInput, computeEffectiveFileName } from "@/components/CustomFileNameInput";
import { logConversionRecord } from "@/lib/firebase/firestore";
import { uploadUserDocument } from "@/lib/firebase/storage";
import { setChainedDocument, getChainedDocument } from "@/lib/pdf-tools/chained-document";

const PIPELINE_CHAIN_TOOLS = [
  { id: "edit-pdf", name: "Canva Live Editor", desc: "Change words with matching fonts", icon: PenTool },
  { id: "compress-pdf", name: "Compress PDF", desc: "Optimize file size in memory", icon: Zap },
  { id: "sign-pdf", name: "Sign PDF", desc: "Stamp certified signatures", icon: Stamp },
  { id: "protect-pdf", name: "Protect PDF", desc: "Lock with 256-bit AES encryption", icon: Lock },
  { id: "add-watermark", name: "Add Watermark", desc: "Stamp custom text or logo", icon: Stamp },
  { id: "organize-pdf", name: "Organize Pages", desc: "Reorder & duplicate pages", icon: Layers },
];

interface MergePdfToolProps {
  isPro: boolean;
  onOpenPricing: () => void;
}

export function MergePdfTool({ isPro, onOpenPricing }: MergePdfToolProps) {
  const router = useRouter();
  const [fileItems, setFileItems] = useState<MergeFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(null);

  // Advanced Merge Options
  const [addPageNumbers, setAddPageNumbers] = useState(false);
  const [pageNumberPosition, setPageNumberPosition] = useState<"bottom-center" | "bottom-right">("bottom-center");
  const [customOutputName, setCustomOutputName] = useState("");
  const [customFileName, setCustomFileName] = useState("");

  // Cloud Backup
  const { user } = useAuth();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [cloudBackupSuccess, setCloudBackupSuccess] = useState(false);

  // Check for in-memory chained document from preceding tool
  useEffect(() => {
    const chained = getChainedDocument();
    if (chained) {
      addFiles([chained]);
    }
  }, []);

  const handleChainToTool = (nextToolId: string) => {
    if (!result?.mergedBytes) return;
    try {
      const chainedFile = new File([result.mergedBytes as any], result.fileName || "merged.pdf", {
        type: "application/pdf",
      });
      setChainedDocument(chainedFile);
      router.push(`/tools/${nextToolId}`);
    } catch (e) {
      console.error("Failed to chain document", e);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadCoverThumbnail = async (file: File): Promise<string | undefined> => {
    try {
      const pdfjs = await loadPdfJs();
      const buffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        useSystemFonts: true,
      }).promise;
      const p = await doc.getPage(1);
      const viewport = p.getViewport({ scale: 0.35 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await (p.render({ canvasContext: ctx as any, viewport, canvas } as any) as any).promise;
        const url = canvas.toDataURL("image/jpeg", 0.75);
        canvas.width = 1;
        canvas.height = 1;
        return url;
      }
    } catch {
      return undefined;
    }
  };

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const newItems: MergeFileItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
          continue;
        }

        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          rotation: 0,
          pageRange: "all",
        });
      }

      if (newItems.length === 0) {
        setError("Please select valid PDF files.");
        return;
      }

      const combinedLength = fileItems.length + newItems.length;
      if (!isPro && combinedLength > 8) {
        setError(
          "Free tier supports merging up to 8 files. Upgrade to Pro for unlimited batch merge."
        );
        return;
      }

      setFileItems((prev) => [...prev, ...newItems]);

      // Asynchronously load page count & cover thumbnail for previews
      for (const item of newItems) {
        try {
          const pages = await getPdfPageCount(item.file);
          const thumb = await loadCoverThumbnail(item.file);
          setFileItems((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, pageCount: pages, thumbnailUrl: thumb } : f
            )
          );
        } catch {
          // Ignore
        }
      }
    },
    [fileItems, isPro]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    setFileItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleDragReorder = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= fileItems.length) return;
    setFileItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  const handleRotateFile = (id: string) => {
    setFileItems((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, rotation: ((f.rotation || 0) + 90) % 360 } : f
      )
    );
  };

  const handleUpdatePageRange = (id: string, range: string) => {
    setFileItems((prev) =>
      prev.map((f) => (f.id === id ? { ...f, pageRange: range } : f))
    );
  };

  const handleRemove = (id: string) => {
    setFileItems((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSortAlphabetical = () => {
    setFileItems((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleSortBySize = () => {
    setFileItems((prev) => [...prev].sort((a, b) => b.size - a.size));
  };

  const handleReverseOrder = () => {
    setFileItems((prev) => [...prev].reverse());
  };

  const handleMerge = async () => {
    if (fileItems.length < 2) {
      setError("Please add at least 2 PDF files to merge.");
      return;
    }

    const combinedSizeBytes = fileItems.reduce((sum, item) => sum + item.size, 0);
    const maxMb = isPro ? PRO_TIER_LIMITS.maxFileSizeMb : FREE_TIER_LIMITS.maxFileSizeMb;
    if (combinedSizeBytes > maxMb * 1024 * 1024) {
      setError(
        `Combined file size (${(combinedSizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMb}MB limit for Free tier. Upgrade to Quick Pass (₹49) or Pro for large merges.`
      );
      return;
    }

    const totalPages = fileItems.reduce((sum, item) => sum + (item.pageCount || 0), 0);
    if (!isPro && totalPages > FREE_TIER_LIMITS.maxPages) {
      setError(
        `Combined page count (${totalPages} pages) exceeds the ${FREE_TIER_LIMITS.maxPages}-page Free limit. Upgrade to Quick Pass (₹49) or Pro for large documents.`
      );
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const res = await mergePdfFiles(fileItems, {
        addPageNumbers,
        pageNumberPosition,
        customOutputName: customOutputName.trim() || undefined,
      });
      setResult(res);
      const lastDot = res.fileName.lastIndexOf(".");
      const base = lastDot > 0 ? res.fileName.substring(0, lastDot) : res.fileName;
      setCustomFileName(base);

      if (user?.id) {
        logConversionRecord(user.id, {
          toolId: "merge-pdf",
          toolName: "Merge PDF Documents",
          fileName: fileItems.map((f) => f.name).join(", "),
          outputFileName: res.fileName,
          fileSizeBytes: res.mergedBytes.length,
          timestamp: Date.now(),
          status: "success",
        }).catch(() => {});
      }

      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch {
        // Ignore
      }
    } catch (err: any) {
      console.error("Merge error:", err);
      setError(
        err?.message || "Failed to merge PDF files. Please check if any file is encrypted with a password."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSamplePdfs = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const pdf1 = await createSamplePdfFile("Part_A_Introduction.pdf", 2);
      const pdf2 = await createSamplePdfFile("Part_B_Financial_Report.pdf", 3);
      await addFiles([pdf1, pdf2]);
    } catch (err: any) {
      setError(err?.message || "Failed to generate sample PDFs.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const effectiveName = computeEffectiveFileName(result.fileName, customFileName);
    const blob = new Blob([result.mergedBytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = effectiveName;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  };

  const handleCloudBackup = async () => {
    if (!user?.id || !result) return;
    setIsBackingUp(true);
    try {
      const blob = new Blob([result.mergedBytes as any], { type: "application/pdf" });
      const res = await uploadUserDocument(user.id, blob, result.fileName, "exports");
      if (res) {
        setCloudBackupSuccess(true);
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (err: any) {
      setError("Cloud backup failed: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const totalPagesCount = fileItems.reduce((acc, f) => acc + (f.pageCount || 0), 0);
  const activeStep: 1 | 2 | 3 = result ? 3 : isProcessing ? 3 : fileItems.length > 0 ? 2 : 1;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Sequential Step Workflow Tracker */}
      <StepWorkflowTracker
        currentStep={activeStep}
        step1Title="Upload PDF Files"
        step2Title="Reorder & Priority"
        step3Title="Merge & Download"
        statusMessage={isProcessing ? "Combining document streams in local RAM..." : null}
      />
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="merge-editor"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: motionTokens.duration.standard }}
            className="space-y-6"
          >
            {/* Tool Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">Merge PDF Documents</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Reorder, select page ranges, rotate, and combine multiple PDF files into one clean document.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <ShieldCheck className="w-4 h-4" /> 100% In-Browser Privacy
              </div>
            </div>

            {/* Dropzone when empty */}
            {fileItems.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border-2 border-dashed transition-colors cursor-pointer bg-white dark:bg-zinc-900 text-center shadow-xs ${
                  isDragging
                    ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800/50"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-zinc-500 hover:shadow-md"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  accept=".pdf"
                  multiple
                  className="hidden"
                />

                <Layers className="h-8 w-8 text-zinc-900 dark:text-zinc-100 mb-3 stroke-[1.75]" />

                <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-1.5">
                  Select PDF Files to Merge
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                  Drag and drop 2 or more PDFs here, or click to browse
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <span className="inline-flex items-center justify-center px-5 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold rounded-2xl shadow-xs transition-colors pointer-events-none">
                    Choose PDF Files
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSamplePdfs();
                    }}
                    className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-950 dark:hover:text-white transition-colors border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    ⚡ Load 2 Sample PDFs
                  </button>
                </div>
              </div>
            ) : (
              /* File Reorder & Merge Configuration Panel */
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-6">
                {/* Header & Quick Sort Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                      {fileItems.length} PDF files queued
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Total: ~{totalPagesCount > 0 ? `${totalPagesCount} pages` : "Calculating..."} • Drag to reorder sequence
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                      }}
                      accept=".pdf"
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add More
                    </button>
                    <button
                      type="button"
                      onClick={handleSortAlphabetical}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Sort alphabetically A-Z"
                    >
                      Sort A–Z
                    </button>
                    <button
                      type="button"
                      onClick={handleReverseOrder}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                      title="Reverse list sequence"
                    >
                      <Undo2 className="w-3 h-3" /> Reverse
                    </button>
                    <button
                      type="button"
                      onClick={() => setFileItems([])}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* File Items List with Drag-and-Drop and Thumbnails */}
                <div className="space-y-3">
                  {fileItems.map((item, index) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedFileIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedFileIndex !== null && draggedFileIndex !== index) {
                          handleDragReorder(draggedFileIndex, index);
                        }
                        setDraggedFileIndex(null);
                      }}
                      className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing bg-white dark:bg-zinc-900 ${
                        draggedFileIndex === index
                          ? "opacity-40 border-dashed border-zinc-950 dark:border-white"
                          : "border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-xs"
                      }`}
                    >
                      {/* Left: Drag grip, order number, thumbnail, details */}
                      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                        <GripVertical className="w-4 h-4 text-zinc-400 opacity-60 group-hover:opacity-100 flex-shrink-0" />
                        <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 flex-shrink-0 shadow-2xs">
                          {index + 1}
                        </span>

                        {/* Thumbnail or Fallback Icon */}
                        <div className="w-10 h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 p-0.5">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.name}
                              className="w-full h-full object-contain"
                              style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-950 dark:text-white truncate max-w-xs sm:max-w-md">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tnum">
                            <span>{(item.size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{item.pageCount ? `${item.pageCount} pages` : "Reading..."}</span>
                            {item.rotation !== 0 && (
                              <span className="px-1 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold">
                                +{item.rotation}°
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Page Range, Rotate, Move, Remove */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                        {/* Page Range Input */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-zinc-500 font-medium">Pages:</label>
                          <input
                            type="text"
                            value={item.pageRange || "all"}
                            onChange={(e) => handleUpdatePageRange(item.id, e.target.value)}
                            placeholder="all"
                            className="w-16 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono text-center text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-950"
                            title="Extract specific pages, e.g. '1-3' or 'all'"
                          />
                        </div>

                        {/* Rotate Document */}
                        <button
                          type="button"
                          onClick={() => handleRotateFile(item.id)}
                          className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Rotate document by +90 degrees"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Up/Down */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMove(index, "up")}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(index, "down")}
                            disabled={index === fileItems.length - 1}
                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer ml-1"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Merge Configuration Options */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Merge Customizations
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Continuous Page Numbering */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={addPageNumbers}
                          onChange={(e) => setAddPageNumbers(e.target.checked)}
                          className="rounded border-zinc-300 accent-zinc-950 dark:accent-white cursor-pointer"
                        />
                        <span>Continuous Page Numbering</span>
                      </label>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-5">
                        Stamps uniform &ldquo;Page X of Y&rdquo; across all combined documents.
                      </p>
                      {addPageNumbers && (
                        <div className="flex gap-2 pl-5 pt-1">
                          {(["bottom-center", "bottom-right"] as const).map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setPageNumberPosition(pos)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border capitalize transition-colors ${
                                pageNumberPosition === pos
                                  ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white"
                                  : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              {pos.replace("-", " ")}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Output Filename Customization */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Custom Output Filename
                      </label>
                      <input
                        type="text"
                        value={customOutputName}
                        onChange={(e) => setCustomOutputName(e.target.value)}
                        placeholder="e.g. Combined_Final_Report.pdf"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white text-xs font-mono focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Merge Action Button */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Fast local execution (Zero cloud uploads)
                  </span>

                  <button
                    type="button"
                    onClick={handleMerge}
                    disabled={isProcessing || fileItems.length < 2}
                    className="w-full sm:w-auto px-6 py-2.5 bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold rounded-2xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-w-[200px]"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Merging in Memory...
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" /> Merge PDF ({fileItems.length} documents)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3 shadow-xs"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <p className="font-bold">Notice</p>
                  <p>{error}</p>
                  {(error.toLowerCase().includes("limit") || error.toLowerCase().includes("upgrade") || error.toLowerCase().includes("free tier")) && (
                    <button
                      type="button"
                      onClick={onOpenPricing}
                      className="font-bold text-rose-900 dark:text-rose-200 underline hover:no-underline cursor-pointer"
                    >
                      View affordable Pro plans (from ₹49) &rarr;
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          /* Merge Success State */
          <motion.div
            key="merge-success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: motionTokens.duration.standard }}
            className="p-8 sm:p-12 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center shadow-xs max-w-2xl mx-auto space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Merge Completed Successfully
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white mt-3 font-mono">
                {computeEffectiveFileName(result.fileName, customFileName)}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono tnum">
                Combined {result.totalFiles} files into {result.totalPages} total pages • {(result.mergedBytes.length / 1024).toFixed(1)} KB
              </p>
            </div>

            {/* Custom Output File Name Customization */}
            <CustomFileNameInput
              defaultFileName={result.fileName}
              value={customFileName}
              onChange={setCustomFileName}
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto px-6 py-3 bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold rounded-2xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 min-w-[200px]"
              >
                <Download className="w-4 h-4" /> Download Merged PDF
              </button>

              <button
                type="button"
                onClick={() => {
                  if (result?.mergedBytes) {
                    const finalName = computeEffectiveFileName(result.fileName, customFileName);
                    const blob = new Blob([result.mergedBytes as unknown as BlobPart], { type: "application/pdf" });
                    const fileObj = new File([blob], finalName, { type: "application/pdf" });
                    window.dispatchEvent(
                      new CustomEvent("docdrop:open-phone-transfer", { detail: { file: fileObj } })
                    );
                  }
                }}
                className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                title="Send merged PDF directly to your smartphone"
              >
                <Smartphone className="w-4 h-4" /> Send to Phone
              </button>

              {user && (
                <button
                  type="button"
                  onClick={handleCloudBackup}
                  disabled={isBackingUp}
                  className="w-full sm:w-auto px-5 py-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBackingUp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving to Cloud...
                    </>
                  ) : cloudBackupSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Backed Up to Cloud!
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" /> Backup to Cloud
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setFileItems([]);
                  setCloudBackupSuccess(false);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                Merge More PDFs
              </button>
            </div>

            {/* In-Memory Tool Chaining Pipeline */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 text-left">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Continue Workflow With This Document
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Jump into another instrument instantly in memory — zero re-uploading required.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                  RAM Pipeline
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PIPELINE_CHAIN_TOOLS.map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => handleChainToTool(tool.id)}
                      className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-600 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-all text-left flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:border-purple-300 dark:group-hover:border-purple-700 transition-colors shrink-0">
                        <ToolIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-purple-700 dark:group-hover:text-purple-300 truncate">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                          {tool.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
