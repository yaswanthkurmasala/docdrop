"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles, Zap, Globe2, Crown, ShieldCheck, X } from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";

interface PricingProps {
  onSelectPlan: (planName: string, price: string) => void;
  isPro: boolean;
}

export function Pricing({ onSelectPlan, isPro }: PricingProps) {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const isINR = currency === "INR";

  return (
    <section id="pricing" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full scroll-mt-20">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: motionTokens.duration.standard }}
        className="text-center max-w-2xl mx-auto mb-10 sm:mb-12"
      >
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-tight font-mono uppercase bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 mb-3">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span>Transparent Client-Side Pricing</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
          Fair, transparent pricing for everyone
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-lg mx-auto">
          No $20/month gouging. Pick an instant 48-hour pass for one-off tasks, or subscribe for the price of a cup of coffee.
        </p>

        {/* Currency & Billing Switchers Container */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {/* Currency Toggle (INR vs USD) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs relative">
            <button
              onClick={() => setCurrency("INR")}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isINR
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {isINR && (
                <motion.div
                  layoutId="currencyTogglePill"
                  transition={motionTokens.spring.snappy}
                  className="absolute inset-0 bg-amber-500 rounded-lg shadow-xs z-0"
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <span>🇮🇳</span>
                <span>INR (₹)</span>
              </span>
            </button>

            <button
              onClick={() => setCurrency("USD")}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                !isINR
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {!isINR && (
                <motion.div
                  layoutId="currencyTogglePill"
                  transition={motionTokens.spring.snappy}
                  className="absolute inset-0 bg-amber-500 rounded-lg shadow-xs z-0"
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <span>🌍</span>
                <span>USD ($)</span>
              </span>
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs relative">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                billingCycle === "monthly"
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {billingCycle === "monthly" && (
                <motion.div
                  layoutId="billingTogglePill"
                  transition={motionTokens.spring.snappy}
                  className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-lg shadow-xs z-0"
                />
              )}
              <span className="relative z-10">Monthly {isINR ? "(₹199)" : "($2.99)"}</span>
            </button>

            <button
              onClick={() => setBillingCycle("yearly")}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "yearly"
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {billingCycle === "yearly" && (
                <motion.div
                  layoutId="billingTogglePill"
                  transition={motionTokens.spring.snappy}
                  className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-lg shadow-xs z-0"
                />
              )}
              <span className="relative z-10">Annual Pass</span>
              <span
                className={`relative z-10 text-[11px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  billingCycle === "yearly"
                    ? "bg-white/20 dark:bg-black/20 text-white dark:text-zinc-950"
                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {isINR ? "₹83/mo" : "$1.58/mo"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Pricing Cards Grid (Compact 4-column layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Tier 1: Free Explorer */}
        <motion.div
          whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
          className="flex flex-col p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                Free Explorer
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60">
                100% Free
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                {isINR ? "₹0" : "$0"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/ forever</span>
            </div>

            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Everyday in-browser conversions with zero setup or cloud uploads.
            </p>

            <div className="my-3.5 h-px bg-zinc-100 dark:bg-zinc-800" />

            {/* Detailed Processing Specs */}
            <ul className="space-y-2 text-[11px] text-zinc-700 dark:text-zinc-300 mb-4">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>RAM Engine:</strong> 100% client-side memory</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>File limits:</strong> Up to 15 MB / 15 pages</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Concurrency:</strong> 1 file processed at a time</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Core tools:</strong> PDF to Markdown, Split & Merge</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Privacy:</strong> Zero cloud storage, total privacy</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
                <X className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                <span>Bulk batch processing disabled</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.96 }}
            className="w-full h-9 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs border border-zinc-200/80 dark:border-zinc-700/80"
            onClick={() => {
              const el = document.getElementById("active-tool-workspace");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Start Free Now
          </motion.button>
        </motion.div>

        {/* Tier 2: The Quick Pass */}
        <motion.div
          whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
          className="flex flex-col p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] shadow-2xs hover:border-amber-500/50 transition-all justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono">
                Quick Pass
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                <Zap className="w-2.5 h-2.5 text-amber-500" />
                <span>48h Pass</span>
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                {isINR ? "₹99" : "$1.99"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/ 48 hours</span>
              <span className="text-[11px] text-zinc-400 font-mono ml-auto">
                {isINR ? "($1.99)" : "(₹99)"}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Got a single paper, tax filing, or thesis? No recurring subscription.
            </p>

            <div className="my-3.5 h-px bg-amber-500/15 dark:bg-amber-500/20" />

            {/* Detailed Processing Specs */}
            <ul className="space-y-2 text-[11px] text-zinc-700 dark:text-zinc-300 mb-4">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Access:</strong> 48 hours full unlimited access</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span><strong>File limits:</strong> Large files up to 100 MB / 300 pages</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Batching:</strong> Batch process up to 25 documents</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Full suite:</strong> All 20+ instruments + RAG chunker</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Export:</strong> Clean GFM tables & organized .zip</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span><strong>One-off:</strong> Single charge, zero auto-renewal</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.96 }}
            className="w-full h-9 flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
            onClick={() => onSelectPlan("Quick Pass (48h)", isINR ? "₹99" : "$1.99")}
          >
            Get Quick Pass ({isINR ? "₹99" : "$1.99"})
          </motion.button>
        </motion.div>

        {/* Tier 3: Pro Coffee Plan (Most Popular) */}
        <motion.div
          whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
          className="flex flex-col p-4 sm:p-5 rounded-2xl border-2 border-amber-500/60 dark:border-amber-400/50 bg-white dark:bg-zinc-900 shadow-md relative ring-1 ring-amber-500/20 justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                Pro Coffee
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>Popular</span>
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                {isINR
                  ? billingCycle === "monthly"
                    ? "₹199"
                    : "₹999"
                  : billingCycle === "monthly"
                  ? "$2.99"
                  : "$19"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {billingCycle === "monthly" ? "/ month" : "/ year"}
              </span>
              {billingCycle === "yearly" && (
                <span className="text-[11px] text-zinc-400 line-through font-medium ml-1">
                  {isINR ? "₹2,388" : "$35.88"}
                </span>
              )}
            </div>

            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Continuous unlimited conversions for less than a cup of coffee.
            </p>

            <div className="my-3.5 h-px bg-zinc-100 dark:bg-zinc-800" />

            {/* Detailed Processing Specs */}
            <ul className="space-y-2 text-[11px] text-zinc-700 dark:text-zinc-300 mb-4">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Unlimited conversions forever</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>File limits:</strong> Unlimited size (device RAM capacity)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Concurrency:</strong> Multi-threaded WebWorker batches</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>AI & OCR:</strong> Advanced OCR audit & token counters</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Downloads:</strong> Instant bulk .zip document exports</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Support:</strong> Priority support & all new tools included</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.96 }}
            className="w-full h-9 flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            onClick={() => {
              const price = isINR
                ? billingCycle === "monthly"
                  ? "₹199"
                  : "₹999"
                : billingCycle === "monthly"
                ? "$2.99"
                : "$19.00";
              onSelectPlan(`Pro Plan (${billingCycle})`, price);
            }}
          >
            {isPro
              ? "Current Plan"
              : isINR
              ? billingCycle === "monthly"
                ? "Subscribe for ₹199"
                : "Subscribe for ₹999"
              : billingCycle === "monthly"
              ? "Subscribe for $2.99"
              : "Subscribe for $19.00"}
          </motion.button>
        </motion.div>

        {/* Tier 4: Early Lifetime Deal */}
        <motion.div
          whileHover={{ y: -3, transition: motionTokens.spring.snappy }}
          className="flex flex-col p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
                Early Lifetime
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                <Crown className="w-2.5 h-2.5 text-purple-500" />
                <span>Value</span>
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                {isINR ? "₹1,499" : "$24"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">/ once</span>
              <span className="text-[11px] text-zinc-400 font-mono ml-auto">
                {isINR ? "($24)" : "(₹1,499)"}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Pay once, own all current & future Pro instruments forever.
            </p>

            <div className="my-3.5 h-px bg-zinc-100 dark:bg-zinc-800" />

            {/* Detailed Processing Specs */}
            <ul className="space-y-2 text-[11px] text-zinc-700 dark:text-zinc-300 mb-4">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Permanent lifetime Pro license key</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Roadmap:</strong> All future instruments & AI tools</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Commercial:</strong> Commercial client project license</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Developer:</strong> Local npm script & automation access</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Priority:</strong> Dedicated queue & feature voting</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Billing:</strong> Pay once, zero recurring renewals</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.96 }}
            className="w-full h-9 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs border border-zinc-700/80"
            onClick={() => onSelectPlan("Early-Bird Lifetime", isINR ? "₹1,499" : "$24.00")}
          >
            Get Lifetime ({isINR ? "₹1,499" : "$24"})
          </motion.button>
        </motion.div>
      </div>

      {/* Purchasing Power Parity & Cashfree Security Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: motionTokens.duration.standard }}
        className="mt-8 p-3.5 sm:p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400 shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Secure Instant Payments:</strong> Supported via Cashfree Payments with UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay, Visa, Mastercard, and NetBanking.
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
          256-bit Bank Grade Security
        </span>
      </motion.div>
    </section>
  );
}
