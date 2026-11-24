"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: ResolvedTheme;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
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
  const [mounted, setMounted] = useState(false);

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

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    let initialMode: ThemeMode = "system";
    try {
      const stored = localStorage.getItem("docdrop_theme") || localStorage.getItem("doctomd_theme");
      if (stored === "dark" || stored === "light" || stored === "system") {
        initialMode = stored as ThemeMode;
      }
    } catch {}

    const resolved = initialMode === "system" ? getSystemTheme() : initialMode;
    setThemeModeState(initialMode);
    setResolvedTheme(resolved);
    applyThemeToDom(resolved);

    // Listen for OS system theme changes
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

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    const resolved = mode === "system" ? getSystemTheme() : mode;
    setResolvedTheme(resolved);
    applyThemeToDom(resolved);
    try {
      localStorage.setItem("docdrop_theme", mode);
    } catch {}
  };

  const toggleTheme = () => {
    const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setThemeMode(next);
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
