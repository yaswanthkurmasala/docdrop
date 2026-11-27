"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Search,
  Layers,
  Scissors,
  Trash2,
  FileSpreadsheet,
  FileCode2,
  FileText,
  RotateCw,
  Hash,
  Stamp,
  Lock,
  Unlock,
  Sparkles,
  Zap,
  ArrowRight,
  X,
  Image as ImageIcon,
  Crop,
  PenTool,
  EyeOff,
  GitCompare,
  Languages,
  Wrench,
  ScanText,
  Camera,
  Presentation,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { TOOLS_REGISTRY, CATEGORIES, type ToolCategory } from "@/lib/tools-registry";

interface ToolsHubProps {
  onSelectTool: (toolId: string) => void;
  activeToolId: string;
}

const getToolIcon = (id: string) => {
  switch (id) {
    case "merge-pdf":
      return <Layers className="w-4 h-4 text-rose-600" />;
    case "split-pdf":
    case "extract-pages":
      return <Scissors className="w-4 h-4 text-rose-600" />;
    case "remove-pages":
      return <Trash2 className="w-4 h-4 text-rose-600" />;
    case "organize-pdf":
      return <Layers className="w-4 h-4 text-rose-600" />;
    case "scan-to-pdf":
      return <Camera className="w-4 h-4 text-rose-600" />;
    case "compress-pdf":
      return <Zap className="w-4 h-4 text-emerald-600" />;
    case "repair-pdf":
      return <Wrench className="w-4 h-4 text-emerald-600" />;
    case "ocr-pdf":
      return <ScanText className="w-4 h-4 text-emerald-600" />;
    case "jpg-to-pdf":
      return <ImageIcon className="w-4 h-4 text-amber-600" />;
    case "word-to-pdf":
      return <FileText className="w-4 h-4 text-amber-600" />;
    case "excel-to-pdf":
      return <FileSpreadsheet className="w-4 h-4 text-amber-600" />;
    case "html-to-pdf":
      return <FileCode2 className="w-4 h-4 text-amber-600" />;
    case "powerpoint-to-pdf":
      return <Presentation className="w-4 h-4 text-amber-600" />;
    case "pdf-to-jpg":
      return <ImageIcon className="w-4 h-4 text-blue-600" />;
    case "pdf-to-word":
      return <FileText className="w-4 h-4 text-blue-600" />;
    case "pdf-to-excel":
      return <FileSpreadsheet className="w-4 h-4 text-blue-600" />;
    case "pdf-to-powerpoint":
      return <Presentation className="w-4 h-4 text-blue-600" />;
    case "pdf-to-pdfa":
      return <ShieldCheck className="w-4 h-4 text-blue-600" />;
    case "rotate-pdf":
      return <RotateCw className="w-4 h-4 text-purple-600" />;
    case "add-page-numbers":
      return <Hash className="w-4 h-4 text-purple-600" />;
    case "add-watermark":
      return <Stamp className="w-4 h-4 text-purple-600" />;
    case "crop-pdf":
      return <Crop className="w-4 h-4 text-purple-600" />;
    case "edit-pdf":
      return <PenTool className="w-4 h-4 text-purple-600" />;
    case "pdf-forms":
      return <FileText className="w-4 h-4 text-purple-600" />;
    case "protect-pdf":
      return <Lock className="w-4 h-4 text-sky-600" />;
    case "unlock-pdf":
      return <Unlock className="w-4 h-4 text-sky-600" />;
    case "sign-pdf":
      return <PenTool className="w-4 h-4 text-sky-600" />;
    case "redact-pdf":
      return <EyeOff className="w-4 h-4 text-sky-600" />;
    case "compare-pdf":
      return <GitCompare className="w-4 h-4 text-sky-600" />;
    case "pdf-to-markdown":
      return <Sparkles className="w-4 h-4 text-indigo-600" />;
    case "ai-summarizer":
      return <Sparkles className="w-4 h-4 text-indigo-600" />;
    case "translate-pdf":
      return <Languages className="w-4 h-4 text-indigo-600" />;
    default:
      return <FileText className="w-4 h-4 text-zinc-600" />;
  }
};

const getCategoryStyles = (category: string) => {
  switch (category) {
    case "organize":
      return {
        iconBg: "bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/25 text-rose-600 dark:text-rose-400",
        sheen: "from-rose-500/[0.08] dark:from-rose-500/[0.12]",
        pill: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      };
    case "optimize":
      return {
        iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
        sheen: "from-emerald-500/[0.08] dark:from-emerald-500/[0.12]",
        pill: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      };
    case "convertTo":
      return {
        iconBg: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/25 text-amber-700 dark:text-amber-300",
        sheen: "from-amber-500/[0.08] dark:from-amber-500/[0.12]",
        pill: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
      };
    case "convertFrom":
      return {
        iconBg: "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/25 text-blue-600 dark:text-blue-400",
        sheen: "from-blue-500/[0.08] dark:from-blue-500/[0.12]",
        pill: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      };
    case "edit":
      return {
        iconBg: "bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/25 text-purple-600 dark:text-purple-400",
        sheen: "from-purple-500/[0.08] dark:from-purple-500/[0.12]",
        pill: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      };
    case "security":
      return {
        iconBg: "bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/25 text-sky-600 dark:text-sky-400",
        sheen: "from-sky-500/[0.08] dark:from-sky-500/[0.12]",
        pill: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
      };
    case "intelligence":
      return {
        iconBg: "bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/25 text-indigo-600 dark:text-indigo-400",
        sheen: "from-indigo-500/[0.08] dark:from-indigo-500/[0.12]",
        pill: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      };
    default:
      return {
        iconBg: "bg-zinc-500/10 dark:bg-zinc-500/15 border-zinc-500/25 text-zinc-600 dark:text-zinc-400",
        sheen: "from-zinc-500/[0.08] dark:from-zinc-500/[0.12]",
        pill: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
      };
  }
};

const renderToolBadge = (badge: string) => {
  switch (badge) {
    case "Popular":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider font-mono uppercase bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 shrink-0 select-none shadow-xs">
          <Flame className="w-2.5 h-2.5 text-rose-500 animate-pulse shrink-0" />
          <span>Popular</span>
        </span>
      );
    case "AI":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider font-mono uppercase bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shrink-0 select-none shadow-xs">
          <Sparkles className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
          <span>AI</span>
        </span>
      );
    case "Pro":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider font-mono uppercase bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0 select-none shadow-xs">
          <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
          <span>Pro</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wider font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 select-none">
          <span>{badge}</span>
        </span>
      );
  }
};

export function ToolsHub({ onSelectTool, activeToolId }: ToolsHubProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((tool) => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || tool.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <section id="all-tools" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 font-mono">
            Full In-Browser Suite
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            Explore All {TOOLS_REGISTRY.length} PDF &amp; Document Tools
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            100% free, private in-browser execution with zero cloud storage.
          </p>
        </div>

        {/* Real-time Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools (merge, split, markdown)..."
            className="w-full pl-10 pr-16 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400 shadow-xs transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills (Mobile edge-to-edge scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === "all"
              ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          All Tools ({TOOLS_REGISTRY.length})
        </button>

        {Object.entries(CATEGORIES).map(([catKey, catVal]) => {
          const count = TOOLS_REGISTRY.filter((t) => t.category === catKey).length;
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <span>{catVal.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                  isSelected ? "bg-white/20 dark:bg-black/20 text-white dark:text-zinc-950" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tools Cards Grid or Empty State */}
      {filteredTools.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-8">
          <div className="inline-flex p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            No tools found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
            No document tools matched &ldquo;{searchQuery}&rdquo;. Try searching for &ldquo;compress&rdquo;, &ldquo;merge&rdquo;, or &ldquo;pdf&rdquo;.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
        {filteredTools.map((tool) => {
          const isActive = activeToolId === tool.id;
          const styles = getCategoryStyles(tool.category);

          return (
            <Link
              key={tool.id}
              href={`/tools/${tool.id}`}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  onSelectTool(tool.id);
                }
              }}
              className="block h-full group outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
            >
              <motion.div
                whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
                whileTap={{ scale: 0.98 }}
                className={`relative overflow-hidden h-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between will-change-[transform] ${
                  isActive
                    ? "border-emerald-500/80 dark:border-emerald-400/80 bg-white dark:bg-zinc-900 shadow-md ring-1 ring-emerald-500/50"
                    : "border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/95 hover:border-zinc-400/80 dark:hover:border-zinc-700 shadow-2xs hover:shadow-lg hover:shadow-zinc-950/5 dark:hover:shadow-black/30"
                }`}
              >
                {/* Ambient Category Gradient Sheen on hover */}
                <div
                  className={`absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br ${styles.sheen} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl pointer-events-none`}
                />

                {/* Inner Top Highlight Rim */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`p-2.5 rounded-xl border shadow-2xs transition-transform duration-200 ease-out group-hover:scale-105 group-hover:-translate-y-0.5 ${styles.iconBg}`}
                    >
                      {getToolIcon(tool.id)}
                    </div>
                    {tool.badge && renderToolBadge(tool.badge)}
                  </div>

                  <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1.5 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="relative z-10 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[9px] uppercase font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded border ${styles.pill}`}
                    >
                      {tool.categoryLabel.split(" ")[0]}
                    </span>
                    <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                      {tool.accepts.slice(0, 2).join(", ").toUpperCase()}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                    <span>{isActive ? "Active" : "Open"}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
                  </span>
                </div>
              </motion.div>
            </Link>
          );
        })}
        </div>
      )}
    </section>
  );
}
