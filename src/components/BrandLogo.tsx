"use client";

import React, { useId } from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showSubtitle = false,
  className = "",
}: BrandLogoProps) {
  const reactId = useId();
  const warmGradId = `docDropWarm-${reactId.replace(/:/g, "")}`;
  const bodyGradId = `docDropBody-${reactId.replace(/:/g, "")}`;
  const backGradId = `docDropBack-${reactId.replace(/:/g, "")}`;

  const iconContainerSizes = {
    sm: "h-7 w-7 rounded-lg",
    md: "h-9 w-9 rounded-xl",
    lg: "h-11 w-11 rounded-2xl",
  }[size];

  const svgSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }[size];

  const titleSizes = {
    sm: "text-sm",
    md: "text-base sm:text-[17px]",
    lg: "text-xl",
  }[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}>
      {/* Precision Instrument Brand Squircle Badge */}
      <div
        className={`relative flex ${iconContainerSizes} items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-all duration-300 group-hover:scale-105 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-700/80 dark:border-zinc-700/90 ring-1 ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] group-hover:border-amber-400/60 group-hover:shadow-[0_0_24px_rgba(245,158,11,0.28)]`}
      >
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent pointer-events-none" />

        {/* Vector Mark: Dual-Sheet Stacking Folio with Warm Amber/Sunset Gold Fold */}
        <svg
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${svgSizes} relative z-10 transition-transform duration-200 group-hover:scale-105`}
        >
          <defs>
            {/* Luxurious Warm Amber Sunset Gradient */}
            <linearGradient id={warmGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#FB923C" />
            </linearGradient>

            {/* Front Crisp Solid Sheet Gradient */}
            <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F1F5F9" />
            </linearGradient>

            {/* Back Drop Sheet (Kinetic In-RAM Stacking Action with Warm Glow) */}
            <linearGradient id={backGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Back Sheet: Translucent Stacking Layer with Warm Honey Hue */}
          <rect
            x="8"
            y="7"
            width="15"
            height="17"
            rx="2.5"
            fill={`url(#${backGradId})`}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />

          {/* Front Sheet: Primary Solid White Folio */}
          <path
            d="M5 4.5C5 3.67157 5.67157 3 6.5 3H14.5L20 8.5V19.5C20 20.3284 19.3284 21 18.5 21H6.5C5.67157 21 5 20.3284 5 19.5V4.5Z"
            fill={`url(#${bodyGradId})`}
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.35))"
          />

          {/* Precision Warm Sunset Fold Flap */}
          <path
            d="M14.5 3V7.25C14.5 7.94036 15.0596 8.5 15.75 8.5H20L14.5 3Z"
            fill={`url(#${warmGradId})`}
          />

          {/* Minimalist Architectural Instrument Slits */}
          <rect x="8" y="12" width="6.5" height="1.5" rx="0.75" fill="#0F172A" fillOpacity="0.85" />
          <rect x="8" y="15" width="9" height="1.5" rx="0.75" fill="#0F172A" fillOpacity="0.4" />
        </svg>
      </div>

      {/* Brand Typographic Identity (Sleek Horizontal Presentation, Perfectly Centered) */}
      <div className={`flex flex-col text-left justify-center ${showSubtitle ? "" : "leading-none"}`}>
        <div className="flex items-baseline leading-none">
          <span
            className={`${titleSizes} font-sans-display tracking-tight text-zinc-950 dark:text-white flex items-baseline leading-none`}
          >
            <span className="font-extrabold text-zinc-950 dark:text-white">Doc</span>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 dark:from-amber-300 dark:via-orange-300 dark:to-rose-300 ml-0.5 transition-all">
              Drop
            </span>
          </span>
        </div>

        {showSubtitle && (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium tracking-tight leading-tight mt-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors font-sans">
            Private Document Studio
          </span>
        )}
      </div>
    </div>
  );
}
