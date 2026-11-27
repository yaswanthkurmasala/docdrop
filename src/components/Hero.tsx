"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import {
  ShieldCheck,
  Sparkles,
  FileText,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface HeroProps {
  onStartClick: () => void;
  onPricingClick: () => void;
}

const DYNAMIC_PHRASES = [
  "100% Private.",
  "Zero Uploads.",
  "Instant Speed.",
  "Truly Secure.",
  "In-Memory Only.",
];

export function Hero({ onStartClick, onPricingClick }: HeroProps) {
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);

  // Parallax 3D Scroll Physics
  const { scrollY } = useScroll();

  // Spatial Parallax: Independent Translation, 3D Tilt, and Dynamic Rotation
  const yReport = useTransform(scrollY, [0, 800], [0, -240]);
  const rotZReport = useTransform(scrollY, [0, 800], [-12, -24]);
  const rotXReport = useTransform(scrollY, [0, 800], [18, 30]);
  const rotYReport = useTransform(scrollY, [0, 800], [16, 8]);

  const yNda = useTransform(scrollY, [0, 800], [0, -190]);
  const rotZNda = useTransform(scrollY, [0, 800], [14, 26]);
  const rotXNda = useTransform(scrollY, [0, 800], [16, 28]);
  const rotYNda = useTransform(scrollY, [0, 800], [-16, -8]);

  const ySheet = useTransform(scrollY, [0, 800], [0, -280]);
  const rotZSheet = useTransform(scrollY, [0, 800], [-6, 6]);
  const rotXSheet = useTransform(scrollY, [0, 800], [24, 12]);
  const rotYSheet = useTransform(scrollY, [0, 800], [8, -4]);

  const yReadme = useTransform(scrollY, [0, 800], [0, -220]);
  const rotZReadme = useTransform(scrollY, [0, 800], [8, -6]);
  const rotXReadme = useTransform(scrollY, [0, 800], [22, 10]);
  const rotYReadme = useTransform(scrollY, [0, 800], [-10, 6]);

  const yRedacted = useTransform(scrollY, [0, 800], [0, -160]);
  const rotZRedacted = useTransform(scrollY, [0, 800], [-18, -32]);

  const yBlueprint = useTransform(scrollY, [0, 800], [0, -250]);
  const rotZBlueprint = useTransform(scrollY, [0, 800], [16, 32]);

  // Dynamic phrase rotator
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePhraseIndex((prev) => (prev + 1) % DYNAMIC_PHRASES.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.06,
      },
    },
  };

  const statusBadgeVariants = {
    hidden: { opacity: 0, y: -16, scale: 0.92, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const headlineVariants = {
    hidden: { opacity: 0, y: 32, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.85,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const subheadVariants = {
    hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.75,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const ctaGroupVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const metricsStripVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative pt-12 pb-12 sm:pt-20 sm:pb-16 text-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden select-none"
    >
      {/* Ambient Luminous Aurora Backlight (Warm Radiant Sunset & Honey Gold) with Opening Expansion */}
      <motion.div
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[380px] pointer-events-none"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/22 via-orange-500/16 to-rose-500/14 dark:from-amber-400/18 dark:via-orange-400/12 dark:to-rose-400/10 rounded-full blur-3xl animate-aurora" />
        <div className="absolute inset-x-1/4 top-1/4 w-1/2 h-1/2 bg-amber-400/18 dark:bg-amber-300/12 rounded-full blur-2xl" />
      </motion.div>

      {/* =========================================================================
          BACKGROUND 3D SPATIAL LAYER: Realistic Translucent Document Pages with 
          3D Perspective Tilt, Real Layout Typography, and Parallax Scroll Physics
          ========================================================================= */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
        style={{ perspective: "1200px" }}
      >
        {/* --- 1. Left Flank: Executive Financial Report Sheet (A4 Proportion) --- */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.88, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-2 sm:top-4 left-0 sm:left-4 lg:left-8 opacity-[0.08] dark:opacity-[0.10] sm:opacity-[0.14] sm:dark:opacity-[0.18]"
        >
          <motion.div
            style={{
              y: yReport,
              rotateZ: rotZReport,
              rotateX: rotXReport,
              rotateY: rotYReport,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <motion.div
              animate={{ y: [0, -10, 0], rotateZ: [0, 1.5, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              style={{ willChange: "transform", transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
              className="w-32 min-[400px]:w-40 sm:w-56 h-48 min-[400px]:h-56 sm:h-76 rounded-2xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/85 p-3 sm:p-4 shadow-xl text-left flex flex-col justify-between"
            >
              <div>
                {/* Document Header & Corner Fold */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                      FINANCIAL REPORT
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                      Q3 AUDIT • IN-RAM
                    </div>
                  </div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-amber-500/60 rounded-tr" />
                </div>

                {/* Miniature Chart & Metric Cards */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50">
                    <span className="text-[11px] font-mono text-zinc-400 block">GROWTH</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">+38.4%</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50">
                    <span className="text-[11px] font-mono text-zinc-400 block">MARGIN</span>
                    <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">82.1%</span>
                  </div>
                </div>

                {/* Miniature Bar Chart Skeleton */}
                <div className="mt-3.5 flex items-end gap-1.5 h-10 px-2 pb-1 rounded bg-zinc-100/60 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/40">
                  <div className="w-1/6 h-[35%] bg-zinc-300 dark:bg-zinc-600 rounded-t-xs" />
                  <div className="w-1/6 h-[50%] bg-zinc-300 dark:bg-zinc-600 rounded-t-xs" />
                  <div className="w-1/6 h-[45%] bg-zinc-300 dark:bg-zinc-600 rounded-t-xs" />
                  <div className="w-1/6 h-[70%] bg-zinc-300 dark:bg-zinc-600 rounded-t-xs" />
                  <div className="w-1/6 h-[60%] bg-zinc-300 dark:bg-zinc-600 rounded-t-xs" />
                  <div className="w-1/6 h-[95%] bg-amber-500 rounded-t-xs" />
                </div>

                {/* Text Paragraph Skeletons */}
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-full" />
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-5/6" />
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-3/4" />
                </div>
              </div>

              {/* Document Page Footer */}
              <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                <span>PAGE 1 OF 12</span>
                <span>RESTRICTED</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* --- 2. Right Flank: Mutual NDA & Cryptographic Signature Sheet --- */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.88, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-4 sm:top-6 right-0 sm:right-4 lg:right-8 opacity-[0.08] dark:opacity-[0.10] sm:opacity-[0.14] sm:dark:opacity-[0.18]"
        >
          <motion.div
            style={{
              y: yNda,
              rotateZ: rotZNda,
              rotateX: rotXNda,
              rotateY: rotYNda,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <motion.div
              animate={{ y: [0, 10, 0], rotateZ: [0, -1.5, 0] }}
              transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              style={{ willChange: "transform", transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
              className="w-32 min-[400px]:w-40 sm:w-56 h-48 min-[400px]:h-56 sm:h-76 rounded-2xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/85 p-3 sm:p-4 shadow-xl text-left flex flex-col justify-between"
            >
              <div>
                {/* Document Header */}
                <div className="pb-2 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                      MUTUAL NDA
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                      SEC. 4.2 • DIGITAL SEAL
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                </div>

                {/* Legal Clause Paragraphs */}
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full w-2/3 mb-2" />
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-full" />
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-11/12" />
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-full" />
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-4/5" />
                </div>

                {/* Digital Signature & Certified Audit Stamp */}
                <div className="mt-4 p-2 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 block">VERIFIED SIGNER</span>
                    <svg
                      viewBox="0 0 70 20"
                      fill="none"
                      className="w-16 h-5 text-zinc-700 dark:text-zinc-200 mt-0.5"
                    >
                      <path
                        d="M3 15C12 3 20 18 28 8C36 1 44 17 65 6"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="w-7 h-7 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-500 font-serif text-xs font-bold shadow-2xs">
                    ★
                  </div>
                </div>
              </div>

              {/* Document Footer */}
              <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                <span>ENCRYPTED IN-RAM</span>
                <span>SIGNED</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        {/* --- 3. Mid-Bottom Left: High-Performance Data Table / Spreadsheet Page --- */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.88, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block absolute bottom-16 left-0 sm:left-4 lg:left-12 opacity-[0.14] dark:opacity-[0.18]"
        >
          <motion.div
            style={{
              y: ySheet,
              rotateZ: rotZSheet,
              rotateX: rotXSheet,
              rotateY: rotYSheet,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <motion.div
              animate={{ y: [0, -8, 0], rotateZ: [0, -1, 0] }}
              transition={{ duration: 8.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              style={{ willChange: "transform", transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
              className="w-56 sm:w-64 h-52 sm:h-56 rounded-2xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/85 p-3.5 shadow-xl text-left flex flex-col justify-between"
            >
              <div>
                {/* Spreadsheet Header */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      DATA_MATRIX.XLSX
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">WASM</span>
                </div>

                {/* Data Table Grid */}
                <div className="mt-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden text-[11px] font-mono">
                  <div className="grid grid-cols-4 bg-zinc-100/90 dark:bg-zinc-800/80 font-bold text-zinc-700 dark:text-zinc-300 py-1 px-1.5 border-b border-zinc-200 dark:border-zinc-800">
                    <span>ID</span>
                    <span>DOC</span>
                    <span>PARSE</span>
                    <span>TOKENS</span>
                  </div>
                  <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-600 dark:text-zinc-400">
                    <div className="grid grid-cols-4 py-1 px-1.5">
                      <span className="text-zinc-900 dark:text-zinc-200 font-bold">01</span>
                      <span>10-K</span>
                      <span className="text-emerald-600 dark:text-emerald-400">42ms</span>
                      <span>18.4k</span>
                    </div>
                    <div className="grid grid-cols-4 py-1 px-1.5">
                      <span className="text-zinc-900 dark:text-zinc-200 font-bold">02</span>
                      <span>P&amp;L</span>
                      <span className="text-emerald-600 dark:text-emerald-400">18ms</span>
                      <span>6.2k</span>
                    </div>
                    <div className="grid grid-cols-4 py-1 px-1.5">
                      <span className="text-zinc-900 dark:text-zinc-200 font-bold">03</span>
                      <span>SPEC</span>
                      <span className="text-emerald-600 dark:text-emerald-400">29ms</span>
                      <span>11.9k</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Footer */}
              <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                <span>ZERO LOSS RECONSTRUCTION</span>
                <span>100% IN-RAM</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* --- 4. Mid-Bottom Right: LLM Architecture & Markdown Specification Page --- */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.88, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block absolute bottom-12 right-0 sm:right-4 lg:right-12 opacity-[0.14] dark:opacity-[0.18]"
        >
          <motion.div
            style={{
              y: yReadme,
              rotateZ: rotZReadme,
              rotateX: rotXReadme,
              rotateY: rotYReadme,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <motion.div
              animate={{ y: [0, 8, 0], rotateZ: [0, 1.2, 0] }}
              transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
              style={{ willChange: "transform", transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
              className="w-56 sm:w-64 h-52 sm:h-56 rounded-2xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/85 p-3.5 shadow-xl text-left flex flex-col justify-between"
            >
              <div>
                {/* Specification Header */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      SPECIFICATION.md
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">GFM</span>
                </div>

                {/* Markdown Content Blocks */}
                <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
                  <div className="text-amber-600 dark:text-amber-400 font-bold"># DocDrop Studio</div>
                  <div className="text-zinc-500 dark:text-zinc-400 pl-2 border-l-2 border-amber-500/40">
                    &gt; Local browser execution only.
                  </div>
                  <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 text-[11px]">
                    <code>$ parse --format markdown</code>
                    <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">✔ 4,820 tokens chunked</div>
                  </div>
                </div>
              </div>

              {/* Markdown Footer */}
              <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                <span>TOKEN OPTIMIZED</span>
                <span className="text-amber-500">READY</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* --- 5. Deep Left Flank: Redacted Intelligence Dossier --- */}
        <motion.div
          initial={{ opacity: 0, x: -30, scale: 0.9, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="hidden xl:block absolute top-1/2 -translate-y-1/2 -left-6 opacity-[0.10] dark:opacity-[0.14]"
        >
          <motion.div style={{ y: yRedacted, rotateZ: rotZRedacted, willChange: "transform" }}>
            <div className="w-44 h-52 rounded-2xl border border-zinc-300 dark:border-zinc-700/80 bg-white/70 dark:bg-zinc-900/60 p-3 shadow-lg text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                  VAULT DOSSIER
                </span>
                <Lock className="w-3 h-3 text-purple-500" />
              </div>
              <div className="h-2.5 bg-zinc-950 dark:bg-zinc-100 rounded-xs w-4/5 my-2 opacity-90" />
              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-full my-1.5" />
              <div className="h-2.5 bg-zinc-950 dark:bg-zinc-100 rounded-xs w-3/5 my-2 opacity-90" />
              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-4/5 my-1.5" />
              <div className="mt-4 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-400">
                CANVAS RASTERIZED
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* --- 6. Deep Right Flank: Organized Multipage Blueprint --- */}
        <motion.div
          initial={{ opacity: 0, x: 30, scale: 0.9, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="hidden xl:block absolute top-1/2 -translate-y-1/2 -right-6 opacity-[0.10] dark:opacity-[0.14]"
        >
          <motion.div style={{ y: yBlueprint, rotateZ: rotZBlueprint, willChange: "transform" }}>
            <div className="w-44 h-52 rounded-2xl border border-zinc-300 dark:border-zinc-700/80 bg-white/70 dark:bg-zinc-900/60 p-3 shadow-lg text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  PAGES 1..4
                </span>
                <FileText className="w-3 h-3 text-zinc-400" />
              </div>
              <div className="grid grid-cols-2 gap-1.5 my-2">
                <div className="h-12 rounded border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-800/60 flex items-center justify-center font-mono text-[11px] font-bold">
                  1
                </div>
                <div className="h-12 rounded border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-800/60 flex items-center justify-center font-mono text-[11px] font-bold">
                  2
                </div>
                <div className="h-12 rounded border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-800/60 flex items-center justify-center font-mono text-[11px] font-bold">
                  3
                </div>
                <div className="h-12 rounded border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-800/60 flex items-center justify-center font-mono text-[11px] font-bold">
                  4
                </div>
              </div>
              <div className="mt-2 text-[11px] font-mono text-zinc-400">
                ORGANIZED &amp; FLATTENED
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* =========================================================================
          FOREGROUND HERO CONTENT
          ========================================================================= */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Top Status Pill */}
        <motion.div
          variants={statusBadgeVariants}
          className="inline-flex items-center justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/20 dark:border-amber-400/20 bg-[var(--surface)]/80 backdrop-blur-md shadow-2xs text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-sans-display">Client-Side Architecture • Zero Cloud Storage</span>
          </div>
        </motion.div>

        {/* Main Headline strictly in 2 Lines with 3 Curated Aesthetic Fonts & Kinetic Transitions */}
        <motion.div variants={headlineVariants} className="max-w-4xl mx-auto space-y-1 sm:space-y-1.5 px-2">
          <h1 className="text-2xl min-[360px]:text-3xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-7xl tracking-tight leading-[1.14] sm:leading-[1.1] select-none">
            {/* Line 1: Bold Contemporary Display Sans */}
            <span className="block font-sans-display font-extrabold tracking-[-0.035em] text-zinc-950 dark:text-white whitespace-normal sm:whitespace-nowrap">
              Drop Any Document.
            </span>

            {/* Line 2: Luxury Italic Serif + Sculptural Avant-Garde (Strictly 1 Single Line) */}
            <span className="inline-flex items-baseline justify-center flex-wrap sm:flex-nowrap mt-1 sm:mt-1.5">
              <span className="font-editorial italic font-normal tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400 dark:from-amber-300 dark:via-orange-300 dark:to-rose-300 animate-text-shimmer mr-2 sm:mr-3.5 text-[1.12em] shrink-0">
                Done &amp;
              </span>

              {/* Zero-Jitter CSS Grid Container: Reserves exact invariant maximum width so letters never shift */}
              <span className="inline-grid grid-cols-1 grid-rows-1 text-left align-baseline">
                {DYNAMIC_PHRASES.map((phrase, idx) => (
                  <span
                    key={idx}
                    aria-hidden="true"
                    className="invisible pointer-events-none select-none col-start-1 row-start-1 whitespace-nowrap font-syne font-extrabold tracking-[-0.03em]"
                  >
                    {phrase}
                  </span>
                ))}

                <span className="col-start-1 row-start-1 whitespace-nowrap">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={activePhraseIndex}
                      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                      transition={{
                        duration: 0.36,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="inline-block font-syne font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white whitespace-nowrap will-change-[transform,opacity,filter]"
                    >
                      {DYNAMIC_PHRASES[activePhraseIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </span>
          </h1>
        </motion.div>

        {/* Subhead with Clean Natural Prose Typography (Zero Badges or Boxes) */}
        <motion.p
          variants={subheadVariants}
          style={{ textWrap: "balance" }}
          className="mt-5 sm:mt-6 text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed font-sans-display text-balance text-center px-2"
        >
          All the PDF and document tools you need — with zero cloud uploads. Convert to LLM-ready Markdown, merge, split, compress, sign, and redact files with total privacy, executing entirely inside your local browser memory.
        </motion.p>

        {/* CTA Buttons: Compact Precision Engineering Scale & Tactile Spring Physics */}
        <motion.div
          variants={ctaGroupVariants}
          className="mt-6 sm:mt-7 flex flex-row items-center justify-center gap-2.5 sm:gap-3 px-4 mx-auto"
        >
          {/* Primary Action Button: Open Document Workbench */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 600, damping: 25 }}
            onClick={onStartClick}
            className="group relative inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-850 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold tracking-tight border border-zinc-900 dark:border-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.85)] active:brightness-95 dark:active:brightness-105 transition-colors cursor-pointer select-none font-sans"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
            <span>Open Document Workbench</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>

          {/* Secondary Action Button: Affordable Passes ($1.99) */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 600, damping: 25 }}
            onClick={onPricingClick}
            className="group relative inline-flex items-center justify-center gap-2 h-9 px-3.5 sm:px-4 rounded-lg bg-white dark:bg-zinc-900/90 hover:bg-amber-50/40 dark:hover:bg-zinc-850 border border-zinc-200/90 dark:border-zinc-800 hover:border-amber-500/40 dark:hover:border-amber-400/40 text-zinc-800 dark:text-zinc-200 text-xs font-semibold tracking-tight shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.25)] active:brightness-95 dark:active:brightness-105 transition-all cursor-pointer select-none font-sans"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 group-hover:rotate-12 transition-transform duration-200 shrink-0" />
            <span>Affordable Passes (from ₹49)</span>
          </motion.button>
        </motion.div>

        {/* Precision Instrument Readout Strip with Monospace Engineering Typography */}
        <motion.div
          variants={metricsStripVariants}
          className="mt-10 sm:mt-12 max-w-3xl mx-auto rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-[var(--surface)]/90 backdrop-blur-md shadow-2xs overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800 text-left transition-colors"
        >
          <div className="p-3.5 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-tech-mono uppercase tracking-wider block">
              Security
            </span>
            <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-1.5 mt-1 font-sans-display">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              100% In-RAM
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-tech-mono uppercase tracking-wider block">
              Throughput
            </span>
            <span className="text-xs sm:text-sm font-tech-mono font-bold text-zinc-950 dark:text-white mt-1 block tnum">
              &lt; 100ms Native
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-tech-mono uppercase tracking-wider block">
              Privacy
            </span>
            <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white mt-1 block font-sans-display">
              Zero Cloud Leak
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-tech-mono uppercase tracking-wider block">
              Tooling
            </span>
            <span className="text-xs sm:text-sm font-tech-mono font-bold text-zinc-950 dark:text-white mt-1 block tnum">
              33+ Instruments
            </span>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
