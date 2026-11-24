import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = {
  title: "Privacy Policy | DocDrop",
  description: "DocDrop Privacy Policy - Zero-knowledge, client-side local document processing.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Studio</span>
        </Link>
        <BrandLogo size="sm" showSubtitle={false} />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Cloud Upload Architecture</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-8 font-mono">Last updated: November 24, 2026</p>

        <div className="prose dark:prose-invert prose-zinc max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">1. Overview & Core Privacy Guarantee</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              DocDrop (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to absolute data privacy. Unlike traditional online PDF tools that upload your private documents to third-party cloud servers, DocDrop operates exclusively client-side inside your browser sandbox (WebAssembly and local JavaScript memory).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">2. Zero Server Document Retention</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              Your files never leave your device. When you convert, compress, merge, sign, or redact documents, the raw bytes are processed purely in your browser&apos;s volatile RAM. We do not store, view, transmit, or retain any of your uploaded files or extracted content on any remote server.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">3. Account & Payment Information</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              When you purchase a Pro plan or lifetime license, transactions are securely handled by regulated third-party payment gateways (Cashfree Payments / Stripe). DocDrop does not store your credit card numbers, CVVs, UPI PINs, or banking credentials. We only receive payment confirmation tokens, customer email addresses, and license status.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">4. Cookies and Local Storage</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              We use browser Local Storage exclusively to persist your user interface preferences (such as dark mode) and your Pro license activation state locally on your machine.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">5. Contact Information</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              If you have any questions or data concerns, contact our privacy officer at{" "}
              <a href="mailto:support@docdrop.app" className="text-amber-500 hover:underline font-medium">support@docdrop.app</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        © 2026 DocDrop Studio. All rights reserved.
      </footer>
    </div>
  );
}
