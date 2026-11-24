import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, RefreshCw } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = {
  title: "Refund & Cancellation Policy | DocDrop",
  description: "DocDrop Refund and Cancellation Policy for digital licenses and subscriptions.",
};

export default function RefundPolicy() {
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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium mb-6">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Fair & Transparent Billing</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Cancellation & Refund Policy</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-8 font-mono">Last updated: November 24, 2026</p>

        <div className="prose dark:prose-invert prose-zinc max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">1. Digital Fulfillment & Delivery</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              DocDrop provides digital software services and web licenses. There are no physical goods or shipping involved. Access to your purchased Pro features (unlimited file size, multi-format export, batch processing) is delivered immediately upon successful payment verification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">2. 7-Day Money Back Guarantee</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              We want you to be 100% satisfied with DocDrop. If you encounter any technical defect, conversion incompatibility, or issue with our instruments, you are eligible for a full refund within <strong>7 calendar days</strong> of your initial purchase date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">3. How to Request a Refund</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              To request a cancellation or refund, email our support desk at{" "}
              <a href="mailto:support@docdrop.app" className="text-amber-500 hover:underline font-medium">support@docdrop.app</a>{" "}
              or message us via our <Link href="/contact" className="text-amber-500 hover:underline font-medium">Contact Page</Link> with:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-600 dark:text-zinc-300">
              <li>Your order or payment transaction ID</li>
              <li>The email address used during payment</li>
              <li>A brief description of why you are requesting a refund</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">4. Refund Processing Timeline</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              Once approved, your refund will be processed through our payment gateway (Cashfree Payments) directly to your original payment method (Bank Account, UPI, or Card). Standard bank settlement takes <strong>5 to 7 business days</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">5. Subscription Cancellations</h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              You can cancel recurring subscriptions at any time with one click from your account dashboard. You will retain active Pro access until the end of your prepaid billing period without further recurring charges.
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
