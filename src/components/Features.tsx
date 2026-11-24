"use client";

import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Table2, Zap, Layers, CheckCircle2, XCircle } from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: motionTokens.duration.standard,
      ease: motionTokens.ease.enter,
    },
  }),
};

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: motionTokens.duration.standard }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 font-mono">
          Engineered for AI Models
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white" style={{ textWrap: "balance" }}>
          Why standard converters break when fed into ChatGPT &amp; Claude
        </h2>
        <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
          Standard tools extract raw text without structure, turning clean spreadsheets and reports into broken, token-wasting noise.
        </p>
      </motion.div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {[
          {
            icon: ShieldCheck,
            title: "100% In-Browser Privacy",
            desc: "Your files are parsed entirely in your browser memory. No data is ever uploaded to a cloud server, making it safe for medical, legal, and financial documents.",
          },
          {
            icon: Table2,
            title: "Pristine GFM Tables",
            desc: "Reconstructs multi-column spreadsheets and balance sheets into GitHub-flavored Markdown tables with aligned headers and preserved numerical columns.",
          },
          {
            icon: Zap,
            title: "40% Token Savings",
            desc: "Automatically strips repeating page headers, footers, watermarks, and broken line wraps—saving hundreds of expensive context tokens per query.",
          },
          {
            icon: Layers,
            title: "Instant RAG Chunking",
            desc: "Split large books, research papers, and documentation into clean 300, 500, or 1,000-token chunks with 50-token overlap, ready for embedding pipelines.",
          },
        ].map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <Icon className="w-5 h-5 text-zinc-900 dark:text-zinc-100 shrink-0" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">{f.title}</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Side-by-Side Comparison Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: motionTokens.duration.standard }}
        className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs"
      >
        <div className="p-6 bg-[var(--surface-muted)] border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            How DocDrop Compares to Traditional Converters
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            See the difference in output quality, speed, and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {/* Traditional Converters */}
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <span>Standard Converters (CloudConvert, Smallpdf)</span>
            </div>
            <ul className="space-y-3.5 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <span className="text-red-600 dark:text-red-400 font-bold text-sm leading-none mt-0.5">✕</span>
                Uploads your confidential files to third-party cloud servers.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-600 dark:text-red-400 font-bold text-sm leading-none mt-0.5">✕</span>
                Loses table structures; numbers end up on random newlines.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-600 dark:text-red-400 font-bold text-sm leading-none mt-0.5">✕</span>
                Injects page numbers and repeated header margins into prompt context.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-600 dark:text-red-400 font-bold text-sm leading-none mt-0.5">✕</span>
                Expensive subscriptions ($12–$20/month) with slow queue delays.
              </li>
            </ul>
          </div>

          {/* DocDrop */}
          <div className="p-6 sm:p-8 space-y-4 bg-emerald-50/25 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>DocDrop (Client-Side & LLM-Optimized)</span>
            </div>
            <ul className="space-y-3.5 text-xs text-[var(--foreground)]">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm leading-none mt-0.5">✓</span>
                <span><strong>100% private:</strong> Runs in browser memory, zero server upload.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm leading-none mt-0.5">✓</span>
                <span><strong>Flawless Markdown tables:</strong> Preserves rows, columns, and numbers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm leading-none mt-0.5">✓</span>
                <span><strong>Token optimized:</strong> Strips noise, calculates real-time API cost.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm leading-none mt-0.5">✓</span>
                <span><strong>Affordable for everyone:</strong> Free tier, $1.99 Quick Pass, or $2.99/mo.</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
