"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  FileText,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Table as TableIcon,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";

export interface ExtractedTableData {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  citations?: number[];
  tables?: ExtractedTableData[];
}

interface DocumentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile?: File | null;
  onSelectPage?: (pageNum: number) => void;
}

export function DocumentChatDrawer({
  isOpen,
  onClose,
  activeFile = null,
  onSelectPage,
}: DocumentChatDrawerProps) {
  const [file, setFile] = useState<File | null>(activeFile);
  const [extractedText, setExtractedText] = useState<string>("");
  const [pageCount, setPageCount] = useState<number>(0);
  const [isParsingText, setIsParsingText] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingAi]);

  // When activeFile changes from props
  useEffect(() => {
    if (activeFile) {
      setFile(activeFile);
      extractDocumentText(activeFile);
    }
  }, [activeFile]);

  // Extract text per page from PDF using pdfjs-dist in browser RAM
  const extractDocumentText = async (targetFile: File) => {
    setIsParsingText(true);
    setError(null);
    setMessages([]);

    try {
      if (targetFile.name.toLowerCase().endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist");
        if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        const buffer = await targetFile.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/",
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        const total = pdf.numPages;
        setPageCount(total);

        let combined = "";
        for (let i = 1; i <= total; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str || "")
            .join(" ");
          combined += `\n\n--- Page ${i} ---\n${pageText}`;
        }

        setExtractedText(combined.trim());

        // Welcome message with quick suggestions
        setMessages([
          {
            id: "welcome-1",
            sender: "assistant",
            text: `👋 Document loaded: **${targetFile.name}** (${total} pages analyzed in memory).
Ask me anything about this document, request an executive summary, or extract all tables directly into Excel (.xlsx).`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        // Plain text / Markdown fallback
        const text = await targetFile.text();
        setPageCount(1);
        setExtractedText(text);
        setMessages([
          {
            id: "welcome-1",
            sender: "assistant",
            text: `👋 Document loaded: **${targetFile.name}**. What would you like to analyze?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      console.error("[DocChat] Text extraction error:", err);
      setError("Unable to read document text. Please make sure the PDF contains readable text.");
    } finally {
      setIsParsingText(false);
    }
  };

  // Helper: parse markdown tables from text
  const parseMarkdownTables = (text: string): ExtractedTableData[] => {
    const tables: ExtractedTableData[] = [];
    const lines = text.split("\n");
    let currentHeaders: string[] = [];
    let currentRows: string[][] = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("|") && line.endsWith("|")) {
        const cells = line
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        // Check if separator line (|---|---|)
        if (cells.every((c) => /^[-:]+$/.test(c))) {
          continue;
        }

        if (!inTable) {
          inTable = true;
          currentHeaders = cells;
          currentRows = [];
        } else {
          currentRows.push(cells);
        }
      } else {
        if (inTable && currentHeaders.length > 0 && currentRows.length > 0) {
          tables.push({
            title: `Table ${tables.length + 1}`,
            headers: currentHeaders,
            rows: currentRows,
          });
          currentHeaders = [];
          currentRows = [];
          inTable = false;
        }
      }
    }

    if (inTable && currentHeaders.length > 0 && currentRows.length > 0) {
      tables.push({
        title: `Table ${tables.length + 1}`,
        headers: currentHeaders,
        rows: currentRows,
      });
    }

    return tables;
  };

  // Export table data to genuine .xlsx file using SheetJS (xlsx)
  const exportTableToExcel = (table: ExtractedTableData) => {
    try {
      const aoa = [table.headers, ...table.rows];
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Table");

      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "document";
      const fileName = `${baseName}_table.xlsx`;

      XLSX.writeFile(workbook, fileName);

      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch {}
    } catch (err) {
      console.error("[DocChat] Excel export failed:", err);
    }
  };

  // Send question to AI
  const handleSendMessage = async (customPrompt?: string) => {
    const questionText = (customPrompt || inputValue).trim();
    if (!questionText || isLoadingAi) return;

    setError(null);
    setInputValue("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingAi(true);

    try {
      let task = "chat";
      if (questionText.toLowerCase().includes("extract all tables")) {
        task = "extract-tables";
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          text: extractedText,
          question: questionText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate AI response.");
      }

      let replyText = data.text || "";
      let extractedTables: ExtractedTableData[] = [];

      // If task was extract-tables, parse JSON
      if (task === "extract-tables") {
        try {
          const cleanJson = replyText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.tables && Array.isArray(parsed.tables)) {
            extractedTables = parsed.tables;
            replyText = `Found **${extractedTables.length} table(s)** in the document. You can preview and download them to Excel (.xlsx) below:`;
          }
        } catch {
          // fallback to markdown parsing
          extractedTables = parseMarkdownTables(replyText);
        }
      } else {
        // Also extract any markdown tables generated in chat reply
        extractedTables = parseMarkdownTables(replyText);
      }

      // Parse [Page X] citations
      const citationsMatches = Array.from(replyText.matchAll(/\[Page\s*(\d+)\]/gi));
      const citations = Array.from(new Set(citationsMatches.map((m) => parseInt(m[1], 10))));

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: citations.length > 0 ? citations : undefined,
        tables: extractedTables.length > 0 ? extractedTables : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("[DocChat] AI response error:", err);
      // Client-side intelligent fallback search
      const fallbackReply = clientSideFallbackSearch(questionText, extractedText);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-fallback-${Date.now()}`,
          sender: "assistant",
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Client-side local keyword search if AI offline
  const clientSideFallbackSearch = (query: string, text: string): string => {
    const qLower = query.toLowerCase();
    const pages = text.split(/--- Page (\d+) ---/);
    const matches: { page: number; snippet: string }[] = [];

    for (let i = 1; i < pages.length; i += 2) {
      const pageNum = parseInt(pages[i], 10);
      const pageContent = pages[i + 1] || "";
      if (pageContent.toLowerCase().includes(qLower)) {
        const snippetIndex = pageContent.toLowerCase().indexOf(qLower);
        const start = Math.max(0, snippetIndex - 80);
        const end = Math.min(pageContent.length, snippetIndex + 140);
        matches.push({
          page: pageNum,
          snippet: "..." + pageContent.slice(start, end).replace(/\s+/g, " ") + "...",
        });
      }
    }

    if (matches.length > 0) {
      let out = `Found **${matches.length} mention(s)** of "${query}" in this document:\n\n`;
      matches.slice(0, 4).forEach((m) => {
        out += `- **[Page ${m.page}]**: ${m.snippet}\n\n`;
      });
      return out;
    }

    return `I analyzed all ${pageCount} pages in memory for "${query}", but found no direct mentions. Try another query or ask for an executive summary!`;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg h-full bg-[var(--surface)]/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-200/90 dark:border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <span>Chat with Document</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                      AI &amp; Excel
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[240px]">
                    {file ? `${file.name} (${pageCount} pgs)` : "No document loaded"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Load another document"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      extractDocumentText(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            {/* Quick Prompt Suggestion Chips */}
            {file && (
              <div className="p-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-zinc-50/50 dark:bg-zinc-950/40">
                {[
                  { label: "Executive Summary", prompt: "Provide an executive summary of this document." },
                  { label: "Extract Tables to Excel", prompt: "Extract all tables in this document." },
                  { label: "Key Deadlines & Risks", prompt: "What are the key deadlines, risks, and obligations mentioned?" },
                  { label: "Payment & Financials", prompt: "What are the financial numbers, pricing, or payment terms?" },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={isLoadingAi || isParsingText}
                    onClick={() => handleSendMessage(chip.prompt)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Parsing State */}
            {isParsingText && (
              <div className="p-4 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Reading document text and page indices into memory...</span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!file && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-full flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/60 transition-colors cursor-pointer text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Drop a document to start chatting
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Supports PDF, Word (.docx), and text files.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white rounded-br-xs"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-xs shadow-2xs"
                    }`}
                  >
                    {/* Message Body */}
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Citations Pill Bar */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Citations:
                        </span>
                        {msg.citations.map((pg) => (
                          <button
                            key={pg}
                            type="button"
                            onClick={() => onSelectPage && onSelectPage(pg)}
                            className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                            title={`Jump to Page ${pg}`}
                          >
                            Page {pg}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Extracted Tables Preview & Excel Export */}
                    {msg.tables && msg.tables.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {msg.tables.map((table, tIdx) => (
                          <div
                            key={tIdx}
                            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                                <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
                                {table.title || `Table ${tIdx + 1}`}
                              </span>

                              <button
                                type="button"
                                onClick={() => exportTableToExcel(table)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                title="Download as .xlsx"
                              >
                                <Download className="w-3 h-3" />
                                <span>Export to Excel</span>
                              </button>
                            </div>

                            {/* Mini Table Preview */}
                            <div className="overflow-x-auto max-h-36 no-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-lg">
                              <table className="w-full text-[10px] text-left border-collapse">
                                <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                                  <tr>
                                    {table.headers.map((h, hIdx) => (
                                      <th key={hIdx} className="p-1.5 border-b border-zinc-200 dark:border-zinc-700 font-bold">
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.rows.slice(0, 5).map((row, rIdx) => (
                                    <tr key={rIdx} className="border-b border-zinc-100 dark:border-zinc-800/60">
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="p-1.5 font-mono text-zinc-600 dark:text-zinc-400">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {table.rows.length > 5 && (
                              <p className="text-[9px] text-zinc-400 italic">
                                Showing 5 of {table.rows.length} rows. Full table included in Excel download.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer timestamp & copy */}
                    {msg.sender === "assistant" && (
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                        <span>{msg.timestamp}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoadingAi && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-xs text-zinc-500 max-w-[200px]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Thinking with citations...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/60 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  disabled={!file || isParsingText || isLoadingAi}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    !file
                      ? "Load a document first to ask questions..."
                      : "Ask about this document or type 'extract tables'..."
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!file || !inputValue.trim() || isLoadingAi}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
