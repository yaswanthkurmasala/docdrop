"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Sparkles, Key, CreditCard, ShieldCheck } from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: { name: string; price: string } | null;
  onUnlockPro: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  selectedPlan,
  onUnlockPro,
}: CheckoutModalProps) {
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [activeTab, setActiveTab] = useState<"checkout" | "license">("checkout");
  const [status, setStatus] = useState<string | null>(null);

  const planName = selectedPlan?.name || "Pro Pass";
  const planPrice = selectedPlan?.price || "$1.99";

  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatus("Please enter your email address.");
      return;
    }

    setStatus("Activating your pass...");
    setTimeout(() => {
      onUnlockPro();
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
      onClose();
    }, 700);
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setStatus("Please enter a valid license key.");
      return;
    }

    setStatus("Verifying license key...");
    setTimeout(() => {
      onUnlockPro();
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with Motion Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Card with Spring Scale-in */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={motionTokens.spring.snappy}
            className="relative z-10 w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 sm:p-7 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-[var(--text-muted)] hover:text-[var(--foreground)] p-1.5 rounded-xl hover:bg-[var(--surface-muted)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 mb-2.5">
                <Sparkles className="w-3.5 h-3.5" /> Instant Activation
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)]">
                Unlock {planName}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Total: <strong className="text-sm font-extrabold text-[var(--foreground)]">{planPrice}</strong> • One-click access
              </p>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-[var(--border)] mb-5 text-xs font-semibold relative">
              <button
                onClick={() => {
                  setActiveTab("checkout");
                  setStatus(null);
                }}
                className={`relative pb-3 px-3 transition-colors flex items-center gap-1.5 ${
                  activeTab === "checkout" ? "text-[var(--foreground)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Quick Checkout
                {activeTab === "checkout" && (
                  <motion.div
                    layoutId="modalTabHighlight"
                    transition={motionTokens.spring.snappy}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--foreground)]"
                  />
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab("license");
                  setStatus(null);
                }}
                className={`relative pb-3 px-3 transition-colors flex items-center gap-1.5 ${
                  activeTab === "license" ? "text-[var(--foreground)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Have a Key?
                {activeTab === "license" && (
                  <motion.div
                    layoutId="modalTabHighlight"
                    transition={motionTokens.spring.snappy}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--foreground)]"
                  />
                )}
              </button>
            </div>

            {activeTab === "checkout" ? (
              <form onSubmit={handleSimulatePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                    Your Email Address (for receipt & backup key):
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1.5">
                  <div className="flex items-center justify-between text-[var(--foreground)] font-semibold">
                    <span>{planName}</span>
                    <span>{planPrice}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>30-day money-back guarantee • Powered by Stripe</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
                >
                  Pay {planPrice} & Unlock Instantly
                </button>
              </form>
            ) : (
              <form onSubmit={handleActivateLicense} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                    Enter your License Key:
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="e.g. DEMO-PRO-2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    Tip: Enter <code className="font-mono bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">DEMO-PRO-2026</code> to test instant activation!
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
                >
                  Verify & Unlock
                </button>
              </form>
            )}

            {status && (
              <p className="mt-3.5 text-xs text-center font-medium text-[var(--foreground)] animate-in fade-in">
                {status}
              </p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
