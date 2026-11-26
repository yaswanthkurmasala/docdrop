"use client";

import React from "react";
import { Check, UploadCloud, Sliders, ArrowRight, Sparkles } from "lucide-react";

interface StepWorkflowTrackerProps {
  currentStep: 1 | 2 | 3;
  step1Title?: string;
  step2Title?: string;
  step3Title?: string;
  statusMessage?: string | null;
}

export function StepWorkflowTracker({
  currentStep,
  step1Title = "Upload Document",
  step2Title = "Configure Features",
  step3Title = "In-RAM Conversion",
  statusMessage,
}: StepWorkflowTrackerProps) {
  const steps = [
    { number: 1, label: step1Title, icon: UploadCloud },
    { number: 2, label: step2Title, icon: Sliders },
    { number: 3, label: step3Title, icon: Sparkles },
  ];

  return (
    <div className="w-full mb-6 p-3 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs">
      <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
        {steps.map((s, idx) => {
          const isDone = currentStep > s.number;
          const isCurrent = currentStep === s.number;
          const Icon = s.icon;

          return (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                <div
                  className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    isDone
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : isCurrent
                      ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xs ring-2 ring-amber-500/30"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Icon className="w-3.5 h-3.5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                        isDone
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isCurrent
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      Step {s.number}
                    </span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse hidden sm:inline-block" />
                    )}
                  </div>
                  <p
                    className={`text-xs font-bold truncate leading-tight ${
                      isCurrent
                        ? "text-zinc-950 dark:text-white"
                        : isDone
                        ? "text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden sm:flex items-center justify-center text-zinc-300 dark:text-zinc-700 px-1">
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {statusMessage && (
        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
