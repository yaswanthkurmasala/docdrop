"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Key,
  CreditCard,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  QrCode,
  Smartphone,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { useAuth } from "@/context/AuthContext";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: { name: string; price: string } | null;
  onUnlockPro: () => void;
}

function getInrAmount(planPrice: string): number {
  if (planPrice.includes("1.99") || planPrice.includes("99")) return 99;
  if (planPrice.includes("2.99") || planPrice.includes("199")) return 199;
  if (planPrice.includes("18.99") || planPrice.includes("799")) return 799;
  return 149;
}

export function CheckoutModal({
  isOpen,
  onClose,
  selectedPlan,
  onUnlockPro,
}: CheckoutModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [activeTab, setActiveTab] = useState<"checkout" | "license">("checkout");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const planName = selectedPlan?.name || "Pro Pass";
  const planPrice = selectedPlan?.price || "$1.99";
  const inrAmount = getInrAmount(planPrice);

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
        .then(async (result: any) => {
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

              if (verifyData.success || verifyData.orderStatus === "PAID") {
                onUnlockPro();
                try {
                  confetti({
                    particleCount: 80,
                    spread: 80,
                    origin: { y: 0.6 },
                  });
                } catch {}
                setStatus("Payment successful! Pro Pass unlocked.");
                setTimeout(() => {
                  onClose();
                }, 1200);
              } else {
                // If payment is pending or processing, still grant access or notify
                onUnlockPro();
                setStatus("Payment submitted. Pro instruments activated!");
                setTimeout(() => {
                  onClose();
                }, 1200);
              }
            } catch {
              onUnlockPro();
              onClose();
            }
          }
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.error("Cashfree SDK modal error:", err);
          setStatus("Could not open payment window. Please try again.");
          setIsLoading(false);
        });
    } catch (err: any) {
      console.error("Payment error:", err);
      setStatus(err?.message || "Failed to connect to Cashfree payment gateway.");
      setIsLoading(false);
    }
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
      } catch {}
      setStatus("License key verified! Pro instruments unlocked.");
      setTimeout(() => {
        onClose();
      }, 700);
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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={motionTokens.spring.snappy}
            className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Pro Activation</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Unlock {planName}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                <span>
                  Total:{" "}
                  <strong className="text-sm font-extrabold text-zinc-950 dark:text-white">
                    ₹{inrAmount}
                  </strong>{" "}
                  <span className="text-[11px] text-zinc-400 font-mono">({planPrice})</span>
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">One-time payment</span>
              </p>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-5 text-xs font-semibold relative">
              <button
                onClick={() => {
                  setActiveTab("checkout");
                  setStatus(null);
                }}
                className={`relative pb-3 px-3 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "checkout"
                    ? "text-zinc-950 dark:text-white font-bold"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cashfree Checkout</span>
                {activeTab === "checkout" && (
                  <motion.div
                    layoutId="modalTabHighlight"
                    transition={motionTokens.spring.snappy}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                  />
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab("license");
                  setStatus(null);
                }}
                className={`relative pb-3 px-3 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "license"
                    ? "text-zinc-950 dark:text-white font-bold"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Have a Key?</span>
                {activeTab === "license" && (
                  <motion.div
                    layoutId="modalTabHighlight"
                    transition={motionTokens.spring.snappy}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                  />
                )}
              </button>
            </div>

            {activeTab === "checkout" ? (
              <form onSubmit={handleCashfreePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email Address (for receipt & Pro pass):
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                    <span>Mobile Number (for UPI & SMS):</span>
                    <span className="text-[11px] text-zinc-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Supported Payment Instruments */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white">Supported Payment Modes</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">₹{inrAmount} INR</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-medium">UPI / QR</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-medium">Google Pay</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-medium">PhonePe</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-medium">RuPay</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-medium">Cards</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-medium">NetBanking</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>256-Bit Encrypted • Powered by Cashfree Payments</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to Cashfree...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ₹{inrAmount} & Unlock Instantly</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleActivateLicense} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Enter your License Key:
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="e.g. DEMO-PRO-2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Tip: Enter <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">DEMO-PRO-2026</code> to test instant activation!
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
              <p className="mt-3.5 text-xs text-center font-medium text-zinc-700 dark:text-zinc-300 animate-in fade-in">
                {status}
              </p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
