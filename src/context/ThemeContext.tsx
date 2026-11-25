"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { flushSync } from "react-dom";

export type ThemeMode = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";
export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: ResolvedTheme;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode, origin?: ThemeTransitionOrigin) => void;
  setTheme: (mode: ThemeMode, origin?: ThemeTransitionOrigin) => void;
  toggleTheme: (origin?: ThemeTransitionOrigin) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "system",
  theme: "light",
  resolvedTheme: "light",
  setThemeMode: () => {},
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const applyThemeToDom = useCallback((resolved: ResolvedTheme) => {
    const root = document.documentElement;
    if (resolved === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, []);

  // Initialize from localStorage + subscribe to OS theme changes
  useEffect(() => {
    let initialMode: ThemeMode = "system";
    try {
      const stored = localStorage.getItem("docdrop_theme") || localStorage.getItem("doctomd_theme");
      if (stored === "dark" || stored === "light" || stored === "system") {
        initialMode = stored as ThemeMode;
      }
    } catch {}

    const resolved = initialMode === "system" ? getSystemTheme() : initialMode;
    queueMicrotask(() => {
      setThemeModeState(initialMode);
      setResolvedTheme(resolved);
    });
    applyThemeToDom(resolved);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      try {
        const currentStored = localStorage.getItem("docdrop_theme") || "system";
        if (currentStored === "system") {
          const nextResolved: ResolvedTheme = e.matches ? "dark" : "light";
          setResolvedTheme(nextResolved);
          applyThemeToDom(nextResolved);
        }
      } catch {}
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [applyThemeToDom]);

  const setThemeMode = (mode: ThemeMode, origin?: ThemeTransitionOrigin) => {
    const nextResolved = mode === "system" ? getSystemTheme() : mode;

    try {
      localStorage.setItem("docdrop_theme", mode);
    } catch {}

    const commitTheme = () => {
      setThemeModeState(mode);
      setResolvedTheme(nextResolved);
      applyThemeToDom(nextResolved);
    };

    if (typeof window === "undefined" || typeof document === "undefined") {
      commitTheme();
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isVisualChange = nextResolved !== resolvedTheme;
    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (!reducedMotion && isVisualChange && typeof docWithVT.startViewTransition === "function") {
      const x = origin?.x ?? window.innerWidth - 140;
      const y = origin?.y ?? 32;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      try {
        const transition = docWithVT.startViewTransition(() => {
          flushSync(commitTheme);
        });

        transition.ready
          .then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 420,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                pseudoElement: "::view-transition-new(root)",
              }
            );
          })
          .catch(() => {});
        return;
      } catch {
        // Fallback below
      }
    }

    // Fallback synchronized CSS transition for browsers without View Transitions API
    if (!reducedMotion && isVisualChange) {
      const root = document.documentElement;
      root.classList.add("theme-transitioning");
      commitTheme();
      window.setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 320);
      return;
    }

    commitTheme();
  };

  const toggleTheme = (origin?: ThemeTransitionOrigin) => {
    const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setThemeMode(next, origin);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        theme: resolvedTheme,
        resolvedTheme,
        setThemeMode,
        setTheme: setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
