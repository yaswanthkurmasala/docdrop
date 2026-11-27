"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Zap,
  PenTool,
  Stamp,
  Lock,
  Scissors,
  Layers,
  FileSpreadsheet,
  Image as ImageIcon,
  ScanText,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { setChainedDocument } from "@/lib/pdf-tools/chained-document";

interface GlobalDropzoneProps {
  onSelectTool?: (toolId: string) => void;
}

interface SmartToolOption {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
}

export function GlobalDropzone({ onSelectTool }: GlobalDropzoneProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const dragCounterRef = useRef(0);

  // Drag enter & leave handlers for window
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
      setIsDraggingOverWindow(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOverWindow(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOverWindow(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      setStagedFile(droppedFile);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  // Determine smart recommendations based on file extension & MIME type
  const getSmartToolOptions = (file: File): SmartToolOption[] => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (ext === "pdf" || file.type === "application/pdf") {
      return [
        {
          id: "pdf-to-markdown",
          name: "PDF to Markdown / AI Ready",
          desc: "Extract text & tables optimized for ChatGPT, Claude, and LLM RAG pipelines",
          icon: Sparkles,
          color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60",
          badge: "Popular",
        },
        {
          id: "compress-pdf",
          name: "Compress PDF",
          desc: "Shrink file size in browser RAM with zero server upload",
          icon: Zap,
          color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60",
        },
        {
          id: "edit-pdf",
          name: "Canva Live Editor Studio",
          desc: "Visual typography & font matching direct editing",
          icon: PenTool,
          color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60",
        },
        {
          id: "sign-pdf",
          name: "Sign Document",
          desc: "Stamp certified cryptographic signature with timestamps",
          icon: Stamp,
          color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60",
        },
        {
          id: "protect-pdf",
          name: "Protect with Password",
          desc: "Lock with 256-bit AES military-grade encryption",
          icon: Lock,
          color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60",
        },
        {
          id: "split-pdf",
          name: "Split & Extract Pages",
          desc: "Separate selected pages or page ranges into new documents",
          icon: Scissors,
          color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60",
        },
        {
          id: "merge-pdf",
          name: "Merge with Other Files",
          desc: "Combine multiple PDF documents into a unified file",
          icon: Layers,
          color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60",
        },
      ];
    }

    if (["docx", "doc"].includes(ext) || file.type.includes("wordprocessingml")) {
      return [
        {
          id: "word-to-pdf",
          name: "Convert Word to PDF",
          desc: "Preserve layout, headings, and formatting locally",
          icon: FileText,
          color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60",
          badge: "Recommended",
        },
        {
          id: "pdf-to-markdown",
          name: "Convert Word to Markdown",
          desc: "Extract clean Markdown text and structure for LLMs",
          icon: Sparkles,
          color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60",
        },
      ];
    }

    if (["xlsx", "xls", "csv"].includes(ext) || file.type.includes("spreadsheet") || file.type === "text/csv") {
      return [
        {
          id: "excel-to-pdf",
          name: "Convert Spreadsheet to PDF",
          desc: "Render tabular rows and data columns into crisp PDF pages",
          icon: FileSpreadsheet,
          color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60",
          badge: "Recommended",
        },
        {
          id: "pdf-to-markdown",
          name: "Convert Sheet to Markdown Table",
          desc: "Extract structured tabular data formatted for prompt engineering",
          icon: Sparkles,
          color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60",
        },
      ];
    }

    if (["jpg", "jpeg", "png", "webp"].includes(ext) || file.type.startsWith("image/")) {
      return [
        {
          id: "jpg-to-pdf",
          name: "Convert Images to PDF",
          desc: "Compile photo or scanned documents into clean, print-ready PDF",
          icon: ImageIcon,
          color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60",
          badge: "Recommended",
        },
        {
          id: "ocr-pdf",
          name: "OCR Text Layer Audit",
          desc: "Inspect text layers and extract digital text in-memory",
          icon: ScanText,
          color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60",
        },
      ];
    }

    // Default fallback tools
    return [
      {
        id: "pdf-to-markdown",
        name: "Process with DocDrop",
        desc: "Convert or analyze document in private browser memory",
        icon: Sparkles,
        color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60",
      },
    ];
  };

  const handleLaunchTool = (toolId: string) => {
    if (!stagedFile) return;

    // Chain staged file in-memory
    setChainedDocument(stagedFile);

    // If on homepage and onSelectTool prop is provided, update active tool directly
    if (pathname === "/" && onSelectTool) {
      onSelectTool(toolId);
    } else {
      router.push(`/tools/${toolId}`);
    }

    setStagedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <>
      {/* 1. Global Full-Screen Drag-Over Backdrop */}
      <AnimatePresence>
        {isDraggingOverWindow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-zinc-950/75 dark:bg-black/85 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="max-w-xl w-full p-10 rounded-3xl border-2 border-dashed border-purple-500/80 bg-zinc-900/90 text-white text-center shadow-2xl space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center animate-bounce">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Drop Document Anywhere
                </h3>
                <p className="text-sm text-zinc-300 mt-1">
                  100% private in-browser execution • Zero server uploads
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Volatile RAM Privacy Guaranteed
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Staged File Smart Action Sheet Modal */}
      <AnimatePresence>
        {stagedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setStagedFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/50">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        Smart Ingestion
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {formatFileSize(stagedFile.size)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white truncate mt-0.5">
                      {stagedFile.name}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStagedFile(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: Action Pills */}
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                    Select Instrument to Launch
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your file will be loaded into local browser memory with zero cloud upload.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {getSmartToolOptions(stagedFile).map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => handleLaunchTool(tool.id)}
                        className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/80 dark:hover:border-purple-500/80 bg-zinc-50/60 dark:bg-zinc-800/40 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-all text-left flex items-start gap-3 group cursor-pointer relative"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-zinc-200/80 dark:border-zinc-700/80 ${tool.color}`}
                        >
                          <ToolIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                              {tool.name}
                            </span>
                            {tool.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                                {tool.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                            {tool.desc}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Memory is instantly cleared on browser tab close
                </span>
                <button
                  type="button"
                  onClick={() => setStagedFile(null)}
                  className="px-4 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
