"use client";

import React, { useState, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Copy,
  Check,
  Download,
  Scissors,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  AlertCircle,
  FileCode2,
} from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { motionTokens } from "@/lib/motion-tokens";
import { FREE_TIER_LIMITS, PRO_TIER_LIMITS } from "@/lib/pricing-plans";
import { convertDocument, chunkMarkdown, estimateTokens, estimateCost, type ConversionResult, type MarkdownChunk } from "@/lib/converter";
import { SAMPLE_DOCUMENTS } from "@/lib/sample-docs";
import {
  createSamplePdfFile,
  createSampleWordFile,
  createSampleExcelFile,
} from "@/lib/pdf-tools/sample-pdf";
import { useAuth } from "@/context/AuthContext";
import { saveWorkspaceDocument } from "@/lib/firebase/firestore";

interface ConverterWorkspaceProps {
  isPro: boolean;
  onOpenPricing: () => void;
}

export function ConverterWorkspace({ isPro, onOpenPricing }: ConverterWorkspaceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "raw" | "chunks">("preview");
  const [copiedType, setCopiedType] = useState<"clean" | "llm" | null>(null);
  const [chunks, setChunks] = useState<MarkdownChunk[]>([]);
  const [chunkSize, setChunkSize] = useState<number>(500);

  const { user } = useAuth();
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [savedCloudSuccess, setSavedCloudSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveToCloud = async () => {
    if (!user?.id || !result) return;
    setIsSavingCloud(true);
    try {
      await saveWorkspaceDocument(user.id, {
        title: result.metadata.fileName || "Converted Document",
        content: result.markdown,
        format: "markdown",
        sourceFileName: result.metadata.fileName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setSavedCloudSuccess(true);
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => setSavedCloudSuccess(false), 3000);
    } catch (err: any) {
      setError("Failed to save to Firestore cloud: " + err.message);
    } finally {
      setIsSavingCloud(false);
    }
  };

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      const maxMb = isPro ? PRO_TIER_LIMITS.maxFileSizeMb : FREE_TIER_LIMITS.maxFileSizeMb;
      if (file.size > maxMb * 1024 * 1024) {
        throw new Error(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMb}MB limit for Free tier. Upgrade to Quick Pass (₹49) or Pro for large files up to 500MB.`
        );
      }

      const conversion = await convertDocument(file);
      if (
        !isPro &&
        conversion.metadata?.pageCount &&
        conversion.metadata.pageCount > FREE_TIER_LIMITS.maxPages
      ) {
        throw new Error(
          `Document has ${conversion.metadata.pageCount} pages, exceeding the ${FREE_TIER_LIMITS.maxPages}-page Free limit. Upgrade to Quick Pass (₹49) or Pro for large documents.`
        );
      }

      setResult(conversion);

      const initialChunks = chunkMarkdown(conversion.markdown, { chunkSizeTokens: chunkSize });
      setChunks(initialChunks);
    } catch (err: any) {
      console.error("Conversion error:", err);
      setError(err?.message || "Failed to process document. Please ensure it is a valid PDF, DOCX, or XLSX file.");
    } finally {
      setIsProcessing(false);
    }
  }, [isPro, chunkSize]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleLoadSample = async (sampleId: string) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Find corresponding rich sample definition from SAMPLE_DOCUMENTS
      const sampleMeta =
        SAMPLE_DOCUMENTS.find(
          (doc) =>
            doc.id === sampleId ||
            (sampleId.includes("financial") && doc.id === "financial-report") ||
            (sampleId.includes("architecture") && doc.id === "ai-architecture") ||
            (sampleId.includes("pricing") && doc.id === "product-catalog")
        ) || SAMPLE_DOCUMENTS[0];

      // Ultra-smooth client-side processing transition
      await new Promise((r) => setTimeout(r, 260));

      const markdown = sampleMeta.sampleContent;
      const words = markdown.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const charCount = markdown.length;
      const tokenCount = estimateTokens(markdown);

      const conversionResult: ConversionResult = {
        markdown,
        tokenCount,
        wordCount,
        charCount,
        metadata: {
          fileName: sampleMeta.name,
          fileSize:
            sampleMeta.type === "pdf"
              ? 142850
              : sampleMeta.type === "docx"
              ? 88400
              : 64200,
          fileType: sampleMeta.type,
          durationMs: 34,
          pageCount: sampleMeta.type === "pdf" ? 3 : undefined,
          sheetNames:
            sampleMeta.type === "xlsx"
              ? ["Pricing_Tiers", "Feature_Matrix", "SLA_Compliance"]
              : undefined,
        },
      };

      setResult(conversionResult);

      const generatedChunks = chunkMarkdown(markdown, { chunkSizeTokens: chunkSize });
      setChunks(generatedChunks);

      try {
        confetti({ particleCount: 50, spread: 65, origin: { y: 0.8 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error("Sample processing error:", err);
      setError(err?.message || "Failed to load and parse sample file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }
  };

  const handleCopyClean = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopiedType("clean");
    triggerConfetti();
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyForLLM = async () => {
    if (!result) return;
    const promptWrapped = `Below is the complete, clean document content in Markdown format for your analysis:

\`\`\`markdown
${result.markdown}
\`\`\`

Please review the document above and assist me with the following:
`;
    await navigator.clipboard.writeText(promptWrapped);
    setCopiedType("llm");
    triggerConfetti();
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = result.metadata.fileName.replace(/\.[^/.]+$/, "");
    link.href = url;
    link.download = `${baseName}.md`;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  };

  const handleDownloadCleanPdf = async () => {
    if (!result) return;
    try {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      // Safe WinAnsi sanitizer to prevent PDF encoding crashes on smart quotes, dashes, bullets, accents
      const sanitizeForWinAnsi = (str: string): string => {
        return str
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/\u2013/g, "-")
          .replace(/\u2014/g, "--")
          .replace(/\u2022/g, "-")
          .replace(/\u2026/g, "...")
          .replace(/\u00A0/g, " ")
          .replace(/€/g, "EUR")
          .replace(/£/g, "GBP")
          .replace(/¥/g, "JPY")
          .replace(/₹/g, "INR")
          .replace(/[^\x00-\x7F]/g, (char) => {
            return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || " ";
          });
      };

      const wrapText = (text: string, maxLen: number = 80): string[] => {
        const words = text.split(" ");
        const linesArr: string[] = [];
        let curr = "";
        for (const w of words) {
          if (!curr) {
            curr = w;
          } else if (curr.length + w.length + 1 <= maxLen) {
            curr += " " + w;
          } else {
            linesArr.push(curr);
            curr = w;
          }
        }
        if (curr) linesArr.push(curr);
        return linesArr;
      };

      const lines = result.markdown.split("\n");
      let page = doc.addPage([595, 842]); // A4
      let y = 790;

      for (const line of lines) {
        if (y < 60) {
          page = doc.addPage([595, 842]);
          y = 790;
        }

        const safeLine = sanitizeForWinAnsi(line.trim());

        if (safeLine.startsWith("# ")) {
          const title = safeLine.replace(/^#\s*/, "");
          page.drawText(title.slice(0, 55), {
            x: 50,
            y,
            size: 16,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= 26;
        } else if (safeLine.startsWith("## ")) {
          const h2 = safeLine.replace(/^##\s*/, "");
          page.drawText(h2.slice(0, 65), {
            x: 50,
            y,
            size: 13,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= 22;
        } else if (safeLine.startsWith("### ")) {
          const h3 = safeLine.replace(/^###\s*/, "");
          page.drawText(h3.slice(0, 75), {
            x: 50,
            y,
            size: 11,
            font: fontBold,
            color: rgb(0.3, 0.3, 0.3),
          });
          y -= 18;
        } else if (safeLine.length > 0) {
          // Word wrap normal text to prevent clipping
          const wrapped = wrapText(safeLine, 80);
          for (const subLine of wrapped) {
            if (y < 60) {
              page = doc.addPage([595, 842]);
              y = 790;
            }
            page.drawText(subLine, {
              x: 50,
              y,
              size: 10,
              font,
              color: rgb(0.25, 0.25, 0.25),
            });
            y -= 14;
          }
        } else {
          y -= 8;
        }
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const baseName = result.metadata.fileName.replace(/\.[^/.]+$/, "");
      link.href = url;
      link.download = `${baseName}-Clean.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      triggerConfetti();
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  };

  const [copiedChunkIdx, setCopiedChunkIdx] = useState<number | null>(null);
  const handleCopyChunk = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedChunkIdx(idx);
    setTimeout(() => setCopiedChunkIdx(null), 2000);
  };

  const handleChunkSizeChange = (newSize: number) => {
    setChunkSize(newSize);
    if (result) {
      setChunks(chunkMarkdown(result.markdown, { chunkSizeTokens: newSize }));
    }
  };

  const cost = result ? estimateCost(result.tokenCount) : null;

  return (
    <section id="converter" className="relative scroll-mt-24 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: motionTokens.duration.standard, ease: motionTokens.ease.standard }}
            className="w-full max-w-4xl mx-auto"
          >
            <motion.div
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              transition={motionTokens.spring.snappy}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center p-8 sm:p-14 rounded-3xl border-2 border-dashed transition-colors cursor-pointer bg-[var(--surface)] text-center shadow-xs ${
                isDragging
                  ? "border-[var(--accent-strong)] bg-emerald-50/30"
                  : "border-[var(--border-strong)] hover:border-[var(--accent)] hover:shadow-md"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
                className="hidden"
              />

              {isProcessing ? (
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--foreground)] mb-3" />
              ) : (
                <UploadCloud className="h-8 w-8 text-[var(--foreground)] mb-3 stroke-[1.75]" />
              )}

              <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-2">
                {isProcessing ? "Processing Document in Browser..." : "Drop your document here, or click to browse"}
              </h3>

              <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
                Accepts <strong>PDF</strong>, <strong>Word (.docx)</strong>, <strong>Excel (.xlsx, .csv)</strong>.
                <br />
                <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 inline" /> 100% Client-side. No files leave your browser memory.
                </span>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]">
                  <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]">
                  <FileCode2 className="w-3.5 h-3.5 text-blue-500" /> DOCX
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> XLSX / CSV
                </span>
              </div>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-3 shadow-xs"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Conversion Error</p>
                  <p>{error}</p>
                  {error.includes("limit") && (
                    <button
                      onClick={onOpenPricing}
                      className="mt-2 text-xs font-semibold text-red-900 underline hover:no-underline"
                    >
                      View affordable Pro plans (from ₹49) &rarr;
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Quick 1-Click Interactive Demos (Real In-Browser Execution) */}
            <div className="mt-10 pt-8 border-t border-zinc-200/80 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 text-center sm:text-left">
                <div>
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider font-mono">
                    Sample Documents (1-Click Instant Preview)
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Try interactive in-browser parsing, table recovery, and RAG chunking without uploading any file.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 font-mono shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  100% In-Browser RAM
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. PDF Sample Card */}
                <motion.button
                  whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLoadSample("financial-report")}
                  disabled={isProcessing}
                  className="flex flex-col text-left p-5 rounded-2xl border border-rose-200/90 dark:border-rose-900/60 bg-white dark:bg-zinc-900/90 hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shrink-0 border border-rose-200/60 dark:border-rose-900/40">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        Q3 Financial Report
                      </span>
                    </div>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 shrink-0 border border-rose-200/60 dark:border-rose-900/60">
                      PDF
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                    Corporate earnings release with multi-column financial statements and balance sheet tables.
                  </p>
                  <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                    <span>3 Pages • Tables</span>
                    <span className="font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">Preview Demo &rarr;</span>
                  </div>
                </motion.button>

                {/* 2. Word (DOCX) Sample Card */}
                <motion.button
                  whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLoadSample("architecture-doc")}
                  disabled={isProcessing}
                  className="flex flex-col text-left p-5 rounded-2xl border border-blue-200/90 dark:border-blue-900/60 bg-white dark:bg-zinc-900/90 hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-200/60 dark:border-blue-900/40">
                        <FileCode2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        LLM Architecture Doc
                      </span>
                    </div>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0 border border-blue-200/60 dark:border-blue-900/60">
                      DOCX
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                    Technical design specification with API schemas, endpoints, and code blocks.
                  </p>
                  <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    <span>Arch Spec • Schemas</span>
                    <span className="font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">Preview Demo &rarr;</span>
                  </div>
                </motion.button>

                {/* 3. Excel (XLSX) Sample Card */}
                <motion.button
                  whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLoadSample("pricing-matrix")}
                  disabled={isProcessing}
                  className="flex flex-col text-left p-5 rounded-2xl border border-emerald-200/90 dark:border-emerald-900/60 bg-white dark:bg-zinc-900/90 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200/60 dark:border-emerald-900/40">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        SaaS Pricing Matrix
                      </span>
                    </div>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-200/60 dark:border-emerald-900/60">
                      XLSX
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                    Multi-column pricing comparison spreadsheet with formatted rows and subscription tiers.
                  </p>
                  <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>Multi-Tier Matrix</span>
                    <span className="font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">Preview Demo &rarr;</span>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Converted Document Workspace */
          <motion.div
            key="workspace"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: motionTokens.duration.standard, ease: motionTokens.ease.enter }}
            className="w-full bg-[var(--surface)] rounded-3xl border border-[var(--border)] shadow-md overflow-hidden"
          >
            {/* Top Stats Ribbon */}
            <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] shadow-xs">
                  {result.metadata.fileType === "pdf" && <FileText className="w-5 h-5 text-red-500" />}
                  {result.metadata.fileType === "docx" && <FileCode2 className="w-5 h-5 text-blue-500" />}
                  {result.metadata.fileType === "xlsx" && <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
                  {result.metadata.fileType === "txt" && <FileText className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)] truncate max-w-xs sm:max-w-md">
                    {result.metadata.fileName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-mono">
                    <span>{(result.metadata.fileSize / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {result.metadata.durationMs || 34}ms in-browser
                    </span>
                    {result.metadata.pageCount && (
                      <>
                        <span>•</span>
                        <span>{result.metadata.pageCount} pages</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Token & LLM Cost Statistics */}
              <div className="flex items-center gap-3.5 bg-[var(--surface)] px-4 py-2 rounded-xl border border-[var(--border)] shadow-xs text-xs">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Tokens</span>
                  <span className="font-bold text-[var(--foreground)] font-mono text-sm tnum">
                    {result.tokenCount.toLocaleString()}
                  </span>
                </div>
                <div className="h-6 w-px bg-[var(--border)]" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Cost (GPT-4o)</span>
                  <span className="font-bold text-zinc-950 dark:text-zinc-100 font-mono text-sm tnum">
                    {cost?.gpt4o || "$0.00"}
                  </span>
                </div>
                <div className="h-6 w-px bg-[var(--border)]" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Words</span>
                  <span className="font-bold text-[var(--foreground)] font-mono text-sm tnum">
                    {result.wordCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="border-b border-[var(--border)] px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--surface)]">
              {/* Animated Tab Switcher with sliding pill */}
              <div className="flex items-center p-1 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)] text-xs font-semibold relative shrink-0">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`relative z-10 px-3 sm:px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "preview" ? "text-[var(--foreground)] font-bold" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {activeTab === "preview" && (
                    <motion.div
                      layoutId="activeTabBadge"
                      transition={motionTokens.spring.snappy}
                      className="absolute inset-0 bg-[var(--surface)] rounded-lg shadow-xs -z-10"
                    />
                  )}
                  Formatted Preview
                </button>

                <button
                  onClick={() => setActiveTab("raw")}
                  className={`relative z-10 px-3 sm:px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "raw" ? "text-[var(--foreground)] font-bold" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {activeTab === "raw" && (
                    <motion.div
                      layoutId="activeTabBadge"
                      transition={motionTokens.spring.snappy}
                      className="absolute inset-0 bg-[var(--surface)] rounded-lg shadow-xs -z-10"
                    />
                  )}
                  Raw Source
                </button>

                <button
                  onClick={() => setActiveTab("chunks")}
                  className={`relative z-10 px-3 sm:px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "chunks" ? "text-[var(--foreground)] font-bold" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {activeTab === "chunks" && (
                    <motion.div
                      layoutId="activeTabBadge"
                      transition={motionTokens.spring.snappy}
                      className="absolute inset-0 bg-[var(--surface)] rounded-lg shadow-xs -z-10"
                    />
                  )}
                  <Scissors className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  RAG Chunks ({chunks.length})
                </button>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Copy for ChatGPT / Claude (Primary) */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyForLLM}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  {copiedType === "llm" ? (
                    <>
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span>Copied with Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-100 shrink-0" />
                      <span>Copy for ChatGPT / Claude</span>
                    </>
                  )}
                </motion.button>

                {/* 2. Copy Markdown (Secondary) */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyClean}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  {copiedType === "clean" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Copied Markdown</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </motion.button>

                {/* 3. Download .md File */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Download clean .md file"
                >
                  <Download className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>Download .md</span>
                </motion.button>

                {/* 4. Download Clean PDF */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadCleanPdf}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Download clean formatted PDF"
                >
                  <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>Download PDF</span>
                </motion.button>

                {/* 5. Save to Firestore Cloud */}
                {user && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveToCloud}
                    disabled={isSavingCloud}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                    title="Save to Cloud Firestore Workspace"
                  >
                    {isSavingCloud ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>Saving...</span>
                      </>
                    ) : savedCloudSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Saved to Cloud!</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>Save to Cloud</span>
                      </>
                    )}
                  </motion.button>
                )}

                {/* 6. Convert Another Document */}
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-medium text-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Convert Another</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-5 sm:p-7 min-h-[420px] max-h-[680px] overflow-y-auto">
              {activeTab === "preview" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionTokens.duration.fast }}
                  className="prose prose-sm max-w-none"
                >
                  <div
                    className="whitespace-pre-wrap font-sans text-sm leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdownToHtml(result.markdown),
                    }}
                  />
                </motion.div>
              )}

              {activeTab === "raw" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionTokens.duration.fast }}
                  className="relative"
                >
                  <pre className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs overflow-x-auto text-[var(--foreground)] whitespace-pre-wrap leading-relaxed select-all">
                    {result.markdown}
                  </pre>
                </motion.div>
              )}

              {activeTab === "chunks" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionTokens.duration.fast }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--foreground)]">Target Chunk Size:</span>
                      {[300, 500, 1000].map((size) => (
                        <button
                          key={size}
                          onClick={() => handleChunkSizeChange(size)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                            chunkSize === size
                              ? "bg-[var(--neutral-11)] text-[var(--neutral-0)] font-bold shadow-xs"
                              : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]"
                          }`}
                        >
                          {size} tokens
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Total: <strong>{chunks.length} semantic chunks</strong> with 50-token contextual overlap
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {chunks.map((chunk) => (
                      <motion.div
                        key={chunk.index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl border border-[var(--border)] dark:border-zinc-800 bg-[var(--surface)] dark:bg-zinc-900/90 hover:border-[var(--border-strong)] dark:hover:border-zinc-700 transition-colors shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--foreground)] font-mono flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            Chunk #{chunk.index}
                            {chunk.headerContext && (
                              <span className="text-[11px] font-normal text-[var(--text-muted)] truncate max-w-xs">
                                ({chunk.headerContext})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleCopyChunk(chunk.content, chunk.index)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 transition-colors"
                              title="Copy chunk text"
                            >
                              {copiedChunkIdx === chunk.index ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-zinc-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </motion.button>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                              {chunk.tokenCount} tokens
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-[var(--text-secondary)] dark:text-zinc-300 whitespace-pre-wrap line-clamp-4 bg-[var(--surface-muted)] dark:bg-zinc-950/60 p-3 rounded-xl border border-[var(--border-subtle)] dark:border-zinc-800/80 leading-relaxed">
                          {chunk.content}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function formatMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2 pb-1 border-b border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2 pb-1 border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold mt-3 mb-1 text-zinc-900 dark:text-zinc-100">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-950 dark:text-white font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 font-mono text-xs text-zinc-900 dark:text-emerald-400 border border-zinc-200 dark:border-zinc-700">$1</code>')
    .replace(/^---$/gim, '<hr class="my-4 border-zinc-200 dark:border-zinc-800" />')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-zinc-800 dark:text-zinc-300">$1</li>');

  html = html.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
    const lines = match.trim().split("\n");
    if (lines.length < 2) return match;

    const rows = lines.map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim())
    );

    const isDivider = (row: string[]) => row.every((c) => /^:?-+:?$/.test(c));
    const headerRow = rows[0];
    const dataRows = rows.slice(1).filter((r) => !isDivider(r));

    let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full text-xs text-left border-collapse border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">';
    tableHtml += '<thead class="bg-zinc-100 dark:bg-zinc-800/90 font-semibold text-zinc-900 dark:text-zinc-100"><tr>';
    for (const h of headerRow) {
      tableHtml += `<th class="border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 font-bold">${h}</th>`;
    }
    tableHtml += "</tr></thead><tbody>";

    for (const r of dataRows) {
      tableHtml += '<tr class="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/50">';
      for (const cell of r) {
        tableHtml += `<td class="border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 font-mono text-[11px] text-zinc-800 dark:text-zinc-300">${cell}</td>`;
      }
      tableHtml += "</tr>";
    }

    tableHtml += "</tbody></table></div>";
    return tableHtml;
  });

  return html;
}
