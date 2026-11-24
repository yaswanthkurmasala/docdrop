"use client";

import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showText = false,
  showSubtitle = false,
  className = "",
}: BrandLogoProps) {
  const pixelSizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 60,
  }[size];

  const containerSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-15 w-15",
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Official App Logo Icon Only */}
      <div
        className={`relative ${containerSizes} shrink-0 cursor-pointer transition-transform duration-200 group-hover:scale-105 rounded-2xl overflow-hidden`}
      >
        <Image
          src="/logo.png"
          alt="DocDrop Logo"
          width={pixelSizes}
          height={pixelSizes}
          priority
          className="w-full h-full object-contain drop-shadow-sm select-none"
        />
      </div>

      {/* Optional Brand Text (Only shown if explicitly enabled) */}
      {showText && (
        <div className="flex flex-col text-left justify-center leading-none">
          <span className="text-base sm:text-[17px] font-sans-display tracking-tight text-zinc-950 dark:text-white font-extrabold flex items-baseline">
            <span>Doc</span>
            <span className="text-amber-500 ml-0.5">Drop</span>
          </span>
          {showSubtitle && (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium tracking-tight mt-0.5">
              Documents. Simplified.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
