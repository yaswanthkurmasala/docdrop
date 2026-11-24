"use client";

import React from "react";
import { ShieldCheck, Cpu, ArrowUpRight, FileText, FileSpreadsheet, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 py-14 sm:py-16 px-4 sm:px-6 lg:px-8 select-none">
      {/* Ambient Top Subtle Hairline Glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-20 bg-amber-500/[0.03] blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-8 pb-12 border-b border-zinc-200/80 dark:border-zinc-800/80">
          {/* Column 1 & 2: Brand Identity & Privacy Indicator */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-4">
            <BrandLogo size="md" />

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm font-sans">
              Private client-side document instruments and conversion studio.
              All operations execute 100% inside your local browser memory sandbox
              with zero server uploads and total cryptographic privacy.
            </p>

            <div className="flex items-center gap-2 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Zero cloud uploads</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>100% local in-browser RAM</span>
            </div>
          </div>

          {/* Column 3: PDF Instruments */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-950 dark:text-white uppercase tracking-wider font-mono">
              PDF Instruments
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#converter"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>PDF to Markdown</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="#all-tools"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Merge & Split PDF</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="#all-tools"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Redact & Blackout</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="#all-tools"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Digital Signatures</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="#all-tools"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Compress & Repair</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Supported Formats */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-950 dark:text-white uppercase tracking-wider font-mono">
              Formats
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span>Adobe PDF <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">(v1.3 – v2.0)</span></span>
              </li>
              <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span>Microsoft Word <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">(.docx)</span></span>
              </li>
              <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span>Excel & CSV Tables <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">(.xlsx)</span></span>
              </li>
              <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-500/80 dark:text-amber-400/80 shrink-0" />
                <span>LLM-Ready Markdown <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">(.md)</span></span>
              </li>
            </ul>
          </div>

          {/* Column 5: Studio Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-950 dark:text-white uppercase tracking-wider font-mono">
              Studio
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#features"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Features & Architecture</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Affordable Passes</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>FAQ & Privacy Guarantee</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Contact & Support</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Engine Status */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
            <span>© 2026 DocDrop Studio</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <a href="/privacy" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Privacy Policy</a>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <a href="/terms" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Terms & Conditions</a>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <a href="/refund" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Refund Policy</a>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <a href="/contact" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Contact Us</a>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Local Sandbox Verified</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              <Cpu className="w-3 h-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span>In-Memory Client Engine</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
