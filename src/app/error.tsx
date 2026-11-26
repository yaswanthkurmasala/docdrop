"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DocDrop Application Runtime Notice:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-md w-full rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Client-Side Safe Recovery
          </span>
          <h2 className="mt-1 text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
            Instrument Interrupted
          </h2>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your document remains 100% private in local RAM. An unexpected event occurred during rendering. You can retry the operation or reset the workbench safely.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Operation</span>
          </button>

          <Link
            href="/"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Workbench</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
