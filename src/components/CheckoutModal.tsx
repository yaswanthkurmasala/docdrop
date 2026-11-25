"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Key,
  CreditCard,
  ShieldCheck,
  Loader2,
  Mail,
  Smartphone,
  Lock,
  Check,
  Building2,
  QrCode,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { useAuth } from "@/context/AuthContext";
import { resolvePlanAmountInr } from "@/lib/pricing-plans";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: { name: string; price: string } | null;
  onUnlockPro: () => void;
}

function getPlanBillingLabel(planName: string): string {
  const lower = planName.toLowerCase();
  if (lower.includes("lifetime")) return "One-time • Lifetime access";
  if (lower.includes("annual") || lower.includes("year")) return "Annual pass • Save 58%";
  if (lower.includes("month")) return "Monthly pass • Cancel anytime";
  if (lower.includes("license")) return "Direct license activation";
  return "One-time • 48-hour unlimited pass";
}

export function CheckoutModal({
  isOpen,
  onClose,
  selectedPlan,
  onUnlockPro,
}: CheckoutModalProps) {
  const { user } = useAuth();
  const [customEmail, setCustomEmail] = useState<string | null>(null);
  const email = customEmail ?? user?.email ?? "";
  const setEmail = (val: string) => setCustomEmail(val);
  const [phone, setPhone] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [activeTab, setActiveTab] = useState<"checkout" | "license">("checkout");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const planName = selectedPlan?.name || "Quick Pass (48h)";
  const planPrice = selectedPlan?.price || "₹49";
  const { amount: inrAmount, display: inrDisplay } = resolvePlanAmountInr(planName, planPrice);
  const showAltPrice = planPrice.trim() !== inrDisplay;
  const billingLabel = getPlanBillingLabel(planName);

  const isSuccessStatus =
    status?.toLowerCase().includes("unlocked") || status?.toLowerCase().includes("verified");
  const isErrorStatus =
    status &&
    !isSuccessStatus &&
    !status.toLowerCase().includes("initializing") &&
    !status.toLowerCase().includes("opening") &&
    !status.toLowerCase().includes("verifying");

  const handleCashfreePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!email || !email.includes("@")) {
      setStatus("Please enter a valid email address for your license receipt.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^0-9]/g, "") || "9999999999";
    if (phone.trim() && cleanPhone.length < 10) {
      setStatus("Please enter a valid 10-digit mobile number for UPI notifications.");
      return;
    }

    setIsLoading(true);
    setStatus("Initializing secure Cashfree checkout...");

    try {
      // 1. Create order on backend
      const res = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName,
          planPrice,
          customerEmail: email,
          customerPhone: cleanPhone,
          customerName: user?.name || email.split("@")[0],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.paymentSessionId) {
        throw new Error(data.error || "Failed to initialize payment session");
      }

      // 2. Dynamically load Cashfree JS SDK v3
      const { load } = await import("@cashfreepayments/cashfree-js");
      const mode =
        process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT?.toLowerCase() === "production"
          ? "production"
          : "sandbox";

      const cashfree = await load({ mode });

      setStatus("Opening payment gateway...");

      // 3. Launch Cashfree Drop-in Modal
      cashfree
        .checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_modal",
        })
        .then(async (result: { error?: { message?: string }; paymentDetails?: unknown }) => {
          if (result.error) {
            console.warn("Cashfree checkout notice:", result.error);
            setStatus(result.error.message || "Payment window closed.");
            setIsLoading(false);
            return;
          }

          if (result.paymentDetails) {
            setStatus("Verifying payment with bank...");
            try {
              const verifyRes = await fetch("/api/cashfree/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderId }),
              });
              const verifyData = await verifyRes.json();

              if (verifyData.verified === true && verifyData.orderStatus === "PAID") {
                onUnlockPro();
                try {
                  confetti({
                    particleCount: 80,
                    spread: 80,
                    origin: { y: 0.6 },
                  });
                } catch {}
                setStatus("Payment verified! Pro Pass unlocked.");
                setTimeout(() => {
                  onClose();
                }, 1200);
              } else {
                setStatus(
                  `Payment status: ${verifyData.orderStatus || "PENDING"}. Pro activates only after bank confirmation.`
                );
              }
            } catch {
              setStatus("Could not confirm payment verification with server. Please contact support with your Order ID.");
            }
          }
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          console.error("Cashfree SDK modal error:", err);
          setStatus("Could not open payment window. Please try again.");
          setIsLoading(false);
        });
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const message = err instanceof Error ? err.message : "Failed to connect to Cashfree payment gateway.";
      setStatus(message);
      setIsLoading(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setStatus("Please enter a valid license key.");
      return;
    }

    setIsLoading(true);
    setStatus("Verifying license key with server...");
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        onUnlockPro();
        try {
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}
        setStatus("License key verified! Pro instruments unlocked.");
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setStatus(data.error || "Invalid or expired license key.");
      }
    } catch {
      setStatus("Unable to reach verification server. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={motionTokens.spring.snappy}
            className="relative z-10 w-full max-w-[440px] rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.45)] overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans"
          >
            {/* Subtle Top Accent Hairline */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

            <div className="p-6 sm:p-7">
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close checkout"
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 pr-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-2">
                    <Sparkles className="w-3 h-3" />
                    <span>Instant Pro Activation</span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-tight">
                    Unlock {planName}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {billingLabel}
                  </p>
                </div>

                <div className="text-right shrink-0 pt-5">
                  <div className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white font-mono tabular-nums">
                    ₹{inrAmount}
                  </div>
                  {showAltPrice && (
                    <div className="text-[11px] text-zinc-400 font-mono">
                      ({planPrice})
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Included Benefits Strip */}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  500 MB / 1,000 pages
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  All 33 Pro tools
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  Batch ZIP
                </span>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="relative isolate grid grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 my-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("checkout");
                    setStatus(null);
                  }}
                  className={`relative py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "checkout"
                      ? "text-zinc-950 dark:text-white font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {activeTab === "checkout" && (
                    <motion.div
                      layoutId="modalTabHighlight"
                      transition={motionTokens.spring.snappy}
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-xs border border-zinc-200/60 dark:border-zinc-700/70 -z-10"
                    />
                  )}
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Instant Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("license");
                    setStatus(null);
                  }}
                  className={`relative py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "license"
                      ? "text-zinc-950 dark:text-white font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {activeTab === "license" && (
                    <motion.div
                      layoutId="modalTabHighlight"
                      transition={motionTokens.spring.snappy}
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-xs border border-zinc-200/60 dark:border-zinc-700/70 -z-10"
                    />
                  )}
                  <Key className="w-3.5 h-3.5" />
                  <span>Have a License Key?</span>
                </button>
              </div>

              {activeTab === "checkout" ? (
                <form onSubmit={handleCashfreePayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Email Address <span className="font-normal text-zinc-400">(for receipt &amp; license)</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-10.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/90 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      <span>Mobile Number <span className="font-normal text-zinc-400">(for UPI &amp; SMS)</span></span>
                      <span className="text-[11px] font-normal text-zinc-400">Optional</span>
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full h-10.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/90 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all"
                      />
                    </div>
                  </div>

                  {/* Clean Structured Payment Summary & Supported Instruments */}
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/90 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Payment Summary
                      </span>
                      <span className="font-mono font-bold text-zinc-950 dark:text-white tabular-nums">
                        Total: ₹{inrAmount} INR
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/70 font-medium">
                        <QrCode className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">UPI / GPay</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/70 font-medium">
                        <CreditCard className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">Cards / RuPay</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/70 font-medium">
                        <Building2 className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">NetBanking</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>256-Bit SSL Encrypted</span>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                        Cashfree Payments
                      </span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={isLoading ? undefined : { scale: 1.01 }}
                    whileTap={isLoading ? undefined : { scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white font-bold px-4 rounded-xl shadow-lg shadow-amber-500/20 border border-amber-400/30 transition-all cursor-pointer text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Cashfree...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 opacity-90" />
                        <span>Pay ₹{inrAmount} &amp; Unlock Instantly</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleActivateLicense} className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      <span>License Key or Cashfree Order ID</span>
                      <span className="text-[11px] font-normal text-zinc-400 font-mono">Instant unlock</span>
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="e.g. dd_179558... or PRO-KEY-2026"
                        className="w-full h-10.5 pl-10 pr-20 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/90 text-xs sm:text-sm font-mono tracking-wide text-zinc-950 dark:text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText();
                            if (clip) setLicenseKey(clip.trim());
                          } catch {
                            setStatus("Press Ctrl+V (or Cmd+V) to paste your key.");
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer shadow-2xs"
                        title="Paste from clipboard"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        <span>Paste</span>
                      </button>
                    </div>
                  </div>

                  {/* Structured Activation Info Card */}
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/90 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Supported Formats
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        Server Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/70">
                        <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Pro License Key</span>
                        <span className="font-mono text-zinc-500 dark:text-zinc-400">Issued via email</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/70">
                        <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Receipt Order ID</span>
                        <span className="font-mono text-zinc-500 dark:text-zinc-400">dd_... / docdrop_...</span>
                      </div>
                    </div>

                    {process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT?.toLowerCase() !== "production" && (
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px]">
                        <span className="text-zinc-500 dark:text-zinc-400">Sandbox demo key:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLicenseKey("DEMO-PRO-2026");
                            setStatus(null);
                          }}
                          className="font-mono font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/25 transition-colors cursor-pointer"
                        >
                          Fill DEMO-PRO-2026
                        </button>
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={isLoading ? undefined : { scale: 1.01 }}
                    whileTap={isLoading ? undefined : { scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold px-4 rounded-xl shadow-md transition-all cursor-pointer text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Key...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify &amp; Activate Pro</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}

              {status && (
                <div
                  className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    isSuccessStatus
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                      : isErrorStatus
                      ? "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300"
                      : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {isSuccessStatus ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : isErrorStatus ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  )}
                  <span className="font-medium leading-snug">{status}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
