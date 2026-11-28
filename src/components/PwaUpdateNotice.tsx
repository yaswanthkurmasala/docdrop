"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function PwaUpdateNotice() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // If a worker is already waiting, prompt immediately
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowBanner(true);
        }

        // Listen for new updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowBanner(true);
              }
            });
          }
        });
      } catch (err) {
        console.debug("[PwaUpdateNotice] Check failed:", err);
      }
    };

    handleServiceWorker();

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl bg-zinc-950/95 dark:bg-zinc-900/95 text-white border border-amber-500/30 shadow-2xl p-3.5 backdrop-blur-xl flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-tight">DocDrop Updated</p>
          <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
            New speed improvements and features are ready.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleUpdate}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
