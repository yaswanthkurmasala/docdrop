"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Cpu, ArrowUpRight, FileText, FileSpreadsheet, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Footer({ onOpenPricing }: { onOpenPricing?: () => void }) {
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
            <BrandLogo size="md" showSubtitle={true} />

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

            {/* Official Instagram Page */}
            <div className="pt-1.5">
              <a
                href="https://www.instagram.com/docdroptools"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-amber-500/10 border border-pink-500/25 hover:border-pink-500/50 text-zinc-900 dark:text-zinc-100 hover:text-pink-600 dark:hover:text-pink-400 text-xs font-semibold transition-all group shadow-2xs"
                title="Follow @docdroptools on Instagram"
              >
                <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                  <InstagramIcon className="w-3 h-3" />
                </div>
                <span>Follow on Instagram: <strong className="font-mono text-pink-600 dark:text-pink-400 font-bold">@docdroptools</strong></span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-pink-500 transition-colors" />
              </a>
            </div>
          </div>

          {/* Column 3: PDF Instruments */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-950 dark:text-white uppercase tracking-wider font-mono">
              PDF Instruments
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/tools/pdf-to-markdown"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>PDF to Markdown</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/merge-pdf"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Merge PDF</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/split-pdf"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Split PDF</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/pdf-to-word"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>PDF to Word</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/compress-pdf"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Compress &amp; Repair PDF</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/redact-pdf"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Redact &amp; Sign PDF</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
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
                <Link
                  href="/#features"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Features &amp; Architecture</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                {onOpenPricing ? (
                  <button
                    type="button"
                    onClick={onOpenPricing}
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
                  >
                    <span>Affordable Passes (from ₹49)</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <Link
                    href="/#pricing"
                    className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <span>Affordable Passes (from ₹49)</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>FAQ &amp; Privacy Guarantee</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors flex items-center gap-1 group"
                >
                  <span>Contact &amp; Support</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/docdroptools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex items-center gap-1.5 group font-medium"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                  <span>Instagram (@docdroptools)</span>
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
            <Link href="/privacy" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Privacy Policy</Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <Link href="/terms" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Terms &amp; Conditions</Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <Link href="/refund" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Refund Policy</Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <Link href="/contact" className="hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-4 hover:underline">Contact Us</Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <a
              href="https://www.instagram.com/docdroptools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400 hover:underline underline-offset-4 font-semibold"
            >
              <InstagramIcon className="w-3 h-3 text-pink-500" />
              <span>@docdroptools</span>
            </a>
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
