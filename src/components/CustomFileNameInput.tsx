"use client";

import React, { useId } from "react";
import { Edit3, RotateCcw, FileText } from "lucide-react";

interface CustomFileNameInputProps {
  defaultFileName: string;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function sanitizeFileName(name: string): string {
  // Remove file system illegal characters: / \ : * ? " < > | and control characters
  return name.replace(/[/\\?%*:|"<>]/g, "").trim();
}

export function parseFileNameParts(fileName: string): { base: string; ext: string } {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot > 0) {
    return {
      base: fileName.substring(0, lastDot),
      ext: fileName.substring(lastDot),
    };
  }
  return { base: fileName, ext: "" };
}

export function computeEffectiveFileName(defaultFileName: string, customName: string): string {
  const { base: defaultBase, ext } = parseFileNameParts(defaultFileName);
  const cleaned = sanitizeFileName(customName);
  const effectiveBase = cleaned || defaultBase;
  return `${effectiveBase}${ext}`;
}

export function CustomFileNameInput({
  defaultFileName,
  value,
  onChange,
  className = "",
}: CustomFileNameInputProps) {
  const inputId = useId();
  const { base: defaultBase, ext } = parseFileNameParts(defaultFileName);
  const effectiveFullName = computeEffectiveFileName(defaultFileName, value);
  const isModified = sanitizeFileName(value) !== "" && sanitizeFileName(value) !== defaultBase;

  return (
    <div
      className={`max-w-md mx-auto w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/90 dark:border-zinc-800 text-left space-y-2.5 shadow-2xs transition-all ${className}`}
    >
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
          <span>Save As (Custom File Name)</span>
        </label>
        {isModified && (
          <button
            type="button"
            onClick={() => onChange(defaultBase)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
            title="Reset to default generated file name"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to default</span>
          </button>
        )}
      </div>

      <div className="relative flex items-center rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-amber-500 transition-all">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultBase || "Enter custom file name..."}
          className="flex-1 min-w-0 px-3.5 py-2.5 text-xs font-mono font-medium text-zinc-950 dark:text-white bg-transparent outline-none placeholder:text-zinc-400"
          autoComplete="off"
          spellCheck={false}
        />
        {ext && (
          <div className="px-3 py-2.5 bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 font-mono font-bold text-xs border-l border-zinc-200 dark:border-zinc-700 select-none shrink-0 tracking-tight">
            {ext}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
        <span className="flex items-center gap-1.5 truncate">
          <FileText className="w-3 h-3 text-zinc-400 shrink-0" />
          <span className="truncate">
            Download as: <strong className="text-zinc-800 dark:text-zinc-200">{effectiveFullName}</strong>
          </span>
        </span>
        {!isModified && (
          <span className="text-[10px] text-zinc-400 italic shrink-0">Default</span>
        )}
      </div>
    </div>
  );
}
