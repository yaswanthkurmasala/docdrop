"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How can you guarantee my documents are 100% private?",
    answer:
      "Unlike traditional file conversion sites that upload your PDFs to unknown cloud servers, DocDrop runs completely inside your browser using client-side JavaScript and WebAssembly. Your files are processed entirely in your computer's local RAM and are never transmitted over the internet.",
  },
  {
    question: "Why does DocDrop output save prompt tokens on ChatGPT & Claude?",
    answer:
      "Standard PDF and Word converters copy redundant margins, headers, footers, repeated watermarks, and broken line-wraps into the prompt. Our cleaning algorithm strips all formatting noise and reconstructs spreadsheets into concise GitHub-flavored Markdown tables, saving up to 40% of context tokens.",
  },
  {
    question: "How does the $1.99 Quick Pass work?",
    answer:
      "The Quick Pass is designed for people who have a single assignment, tax filing, or work project and don't want another recurring monthly subscription. You pay $1.99 once, and your browser is unlocked for 48 hours of unlimited conversions and batch uploads.",
  },
  {
    question: "Can I install and use this as an npm package in my own codebase?",
    answer:
      "Yes! The core conversion engine is packaged as an npm package (`doc2md-core`). You can import it directly into your Node.js or browser RAG pipelines to convert documents programmatically.",
  },
  {
    question: "Which file formats are currently supported?",
    answer:
      "We support Adobe PDF (.pdf), Microsoft Word (.docx), Microsoft Excel (.xlsx, .xls), Comma-Separated Values (.csv), and standard plain text / Markdown (.txt, .md).",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: motionTokens.duration.standard }}
        className="text-center mb-14"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 font-mono">
          Frequently Asked Questions
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
          Everything you need to know
        </h2>
      </motion.div>

      <div className="space-y-3.5">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs transition-colors hover:border-[var(--border-strong)]"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent-strong)] transition-colors select-none"
              >
                <span>{faq.question}</span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={motionTokens.spring.snappy}
                >
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 ml-3" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: motionTokens.duration.standard, ease: motionTokens.ease.standard },
                      opacity: { duration: motionTokens.duration.fast },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3.5 max-w-[70ch]">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
