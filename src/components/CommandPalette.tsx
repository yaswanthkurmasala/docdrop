"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Sparkles,
  Zap,
  Layers,
  Scissors,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  RotateCw,
  Stamp,
  Lock,
  Unlock,
  PenTool,
  EyeOff,
  GitCompare,
  Wrench,
  ScanText,
  Camera,
  Languages,
  Presentation,
  ShieldCheck,
  X,
  CornerDownLeft,
  ArrowRight,
  Flame,
  Video,
} from "lucide-react";
import { TOOLS_REGISTRY, ToolDefinition } from "@/lib/tools-registry";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "organize":
      return <Layers className="w-4 h-4 text-rose-500" />;
    case "optimize":
      return <Zap className="w-4 h-4 text-emerald-500" />;
    case "convertTo":
      return <FileText className="w-4 h-4 text-amber-500" />;
    case "convertFrom":
      return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
    case "edit":
      return <PenTool className="w-4 h-4 text-purple-500" />;
    case "security":
      return <Lock className="w-4 h-4 text-sky-500" />;
    case "intelligence":
      return <Sparkles className="w-4 h-4 text-indigo-500" />;
    case "media":
      return <Video className="w-4 h-4 text-violet-500" />;
    default:
      return <FileText className="w-4 h-4 text-zinc-500" />;
  }
};

export function CommandPalette({ isOpen, onClose, onSelectTool }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered by parent or global listener
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTools = useMemo(() => {
    if (!query.trim()) {
      // Default: Top popular & essential tools
      return TOOLS_REGISTRY.slice(0, 10);
    }

    const q = query.toLowerCase().trim();
    return TOOLS_REGISTRY.filter((tool) => {
      const matchName = tool.name.toLowerCase().includes(q);
      const matchDesc = tool.description.toLowerCase().includes(q);
      const matchCategory = tool.categoryLabel.toLowerCase().includes(q);
      const matchFormats = tool.accepts.some((fmt) => fmt.toLowerCase().includes(q));
      return matchName || matchDesc || matchCategory || matchFormats;
    });
  }, [query]);

  // Handle arrow navigation & selection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredTools.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredTools.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % filteredTools.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredTools[selectedIndex];
      if (selected) {
        handleChoose(selected.id);
      }
    }
  };

  const handleChoose = (toolId: string) => {
    onSelectTool(toolId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="relative border-b border-zinc-100 dark:border-zinc-800 p-4 flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-400 shrink-0 ml-1" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search 33+ tools or formats (e.g. compress, merge, docx, excel)..."
                className="w-full bg-transparent text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              {filteredTools.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <Search className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-semibold">No document tools match "{query}"</p>
                  <p className="text-[11px] text-zinc-500">
                    Try searching for "PDF", "Word", "Merge", "Split", or "Sign"
                  </p>
                </div>
              ) : (
                filteredTools.map((tool, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => handleChoose(tool.id)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-2xs`}
                        >
                          {getCategoryIcon(tool.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold truncate">{tool.name}</span>
                            {tool.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 shrink-0">
                                {tool.badge}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:inline">
                              {tool.categoryLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                            {tool.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 hidden sm:inline">
                          {tool.accepts.join(", ").toUpperCase()}
                        </span>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                            <span>Open</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 px-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                    ↑
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                    ↓
                  </kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                    Enter
                  </kbd>
                  <span>select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                    Esc
                  </kbd>
                  <span>close</span>
                </span>
              </div>
              <span className="hidden sm:inline font-mono">100% In-Browser RAM</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
