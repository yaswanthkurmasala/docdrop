import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = {
  title: "Terms and Conditions | DocDrop",
  description: "Terms and conditions for using DocDrop PDF conversion and document instruments.",
};

export default function TermsOfService() {
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
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Terms and Conditions</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-8 font-mono">Last updated: November 24, 2026</p>

        <div className="prose dark:prose-invert prose-zinc max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">1. Agreement to Terms</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              By accessing and using DocDrop, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">2. Description of Service</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              DocDrop provides private client-side browser utilities for document conversion, compression, merging, splitting, OCR, and PDF manipulation. All core file conversions run directly on the user&apos;s machine.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">3. Subscription & Pro Passes</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              We offer both free tier capabilities and paid Pro licenses (24-Hour Day Pass, Monthly Pro, and Lifetime Access). Payments are billed upfront in the displayed currency (INR / USD). Upon successful payment processing through our authorized payment partner, your license is immediately activated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">4. User Responsibilities & Acceptable Use</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              You agree not to use DocDrop to process materials that infringe copyright, contain malicious code, or violate any applicable laws. Because processing is local to your machine, you remain solely responsible for the content you handle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">5. Disclaimer of Warranties & Limitation of Liability</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              The service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. DocDrop disclaims all warranties of any kind, whether express or implied. In no event shall DocDrop be liable for any indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">6. Governing Law</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
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
