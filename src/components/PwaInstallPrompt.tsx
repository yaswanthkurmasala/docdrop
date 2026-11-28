"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, WifiOff, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial online status
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Check if already in standalone display mode
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        setIsInstalled(true);
      }

      // Check dismissed preference in current session
      const dismissed = sessionStorage.getItem("docdrop_pwa_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }

      // Listen for browser install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    } catch (err) {
      console.warn("[PWA] Prompt error:", err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("docdrop_pwa_dismissed", "true");
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Offline Status Badge Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-zinc-950 font-bold text-xs shadow-lg backdrop-blur-md"
          >
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Offline Mode Active — 100% In-RAM Engine Ready</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Promotion Banner */}
      <AnimatePresence>
        {isInstallable && !isInstalled && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-[80] max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto p-4 rounded-3xl bg-[var(--surface)]/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800 shadow-xl"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
                <Download className="w-5 h-5" />
              </div>

              <div className="flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                    Install DocDrop App
                  </h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Offline
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                  Zero cloud uploads. Run all document tools offline from your desktop or home screen.
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install App</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Later
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
