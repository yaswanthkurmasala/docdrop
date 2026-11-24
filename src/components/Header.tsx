"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Sparkles,
  Terminal,
  Key,
  ChevronDown,
  ChevronUp,
  Layers,
  Scissors,
  Trash2,
  Camera,
  Zap,
  Wrench,
  ScanText,
  Image as ImageIcon,
  FileText,
  Presentation,
  FileSpreadsheet,
  FileCode2,
  RotateCw,
  Hash,
  Stamp,
  Crop,
  PenTool,
  Lock,
  Unlock,
  EyeOff,
  GitCompare,
  Languages,
  Monitor,
  Sun,
  Moon,
  ArrowRight,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Flame,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { BrandLogo } from "@/components/BrandLogo";
import { TOOLS_REGISTRY, CATEGORIES, type ToolCategory } from "@/lib/tools-registry";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onOpenPricing: () => void;
  onOpenLicenseModal: () => void;
  onSelectTool: (toolId: string) => void;
  onOpenAuthModal: (tab?: "login" | "signup") => void;
  isPro: boolean;
}

const getCategoryColor = (cat: ToolCategory) => {
  switch (cat) {
    case "organize":
      return "bg-rose-500 text-rose-500";
    case "optimize":
      return "bg-emerald-500 text-emerald-500";
    case "convertTo":
      return "bg-cyan-500 text-cyan-500";
    case "convertFrom":
      return "bg-blue-500 text-blue-500";
    case "edit":
      return "bg-purple-500 text-purple-500";
    case "security":
      return "bg-sky-500 text-sky-500";
    case "intelligence":
      return "bg-indigo-500 text-indigo-500";
    default:
      return "bg-zinc-500 text-zinc-500";
  }
};

const getToolItemIcon = (id: string) => {
  switch (id) {
    case "merge-pdf":
      return <Layers className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case "split-pdf":
    case "extract-pages":
      return <Scissors className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case "remove-pages":
      return <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case "organize-pdf":
      return <Layers className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case "scan-to-pdf":
      return <Camera className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case "compress-pdf":
      return <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "repair-pdf":
      return <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "ocr-pdf":
      return <ScanText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "jpg-to-pdf":
      return <ImageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "word-to-pdf":
      return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case "powerpoint-to-pdf":
      return <Presentation className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "excel-to-pdf":
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "html-to-pdf":
      return <FileCode2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "pdf-to-jpg":
      return <ImageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "pdf-to-word":
      return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case "pdf-to-powerpoint":
      return <Presentation className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "pdf-to-excel":
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "pdf-to-pdfa":
      return <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case "rotate-pdf":
      return <RotateCw className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "add-page-numbers":
      return <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "add-watermark":
      return <Stamp className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "crop-pdf":
      return <Crop className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "edit-pdf":
      return <PenTool className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "pdf-forms":
      return <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "protect-pdf":
      return <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case "unlock-pdf":
      return <Unlock className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case "sign-pdf":
      return <PenTool className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case "redact-pdf":
      return <EyeOff className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case "compare-pdf":
      return <GitCompare className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case "pdf-to-markdown":
      return <FileCode2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case "ai-summarizer":
      return <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case "translate-pdf":
      return <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    default:
      return <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />;
  }
};

const renderToolBadge = (badge: string) => {
  switch (badge) {
    case "Popular":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold tracking-tight font-sans bg-rose-500/[0.08] dark:bg-rose-500/[0.14] text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0 select-none">
          <Flame className="w-2.5 h-2.5 text-rose-500 shrink-0" />
          <span>Popular</span>
        </span>
      );
    case "AI":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold tracking-tight font-sans bg-indigo-500/[0.08] dark:bg-indigo-500/[0.14] text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 select-none">
          <Sparkles className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
          <span>AI</span>
        </span>
      );
    case "Pro":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold tracking-tight font-sans bg-amber-500/[0.08] dark:bg-amber-500/[0.14] text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0 select-none">
          <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
          <span>Pro</span>
        </span>
      );
    case "Seal":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold tracking-tight font-sans bg-sky-500/[0.08] dark:bg-sky-500/[0.14] text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0 select-none">
          <ShieldCheck className="w-2.5 h-2.5 text-sky-500 shrink-0" />
          <span>Seal</span>
        </span>
      );
    case "Secure":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold tracking-tight font-sans bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 select-none">
          <Lock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
          <span>Secure</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium tracking-tight font-sans bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 select-none">
          <span>{badge}</span>
        </span>
      );
  }
};

export function Header({
  onOpenPricing,
  onOpenLicenseModal,
  onSelectTool,
  onOpenAuthModal,
  isPro,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isConvertDropdownOpen, setIsConvertDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const { themeMode, setThemeMode, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer when resizing up to desktop (lg+)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false);
        setIsConvertDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToolClick = (id: string) => {
    setIsMegaMenuOpen(false);
    setIsConvertDropdownOpen(false);
    setIsMobileMenuOpen(false);
    onSelectTool(id);
    const el = document.getElementById("active-tool-workspace");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div ref={menuRef} className="sticky top-0 z-50 w-full">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease.standard }}
        className={`w-full transition-all duration-200 border-b ${
          isScrolled || isMegaMenuOpen
            ? "border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-xs"
            : "border-zinc-200/60 dark:border-zinc-800/60 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <a href="#" className="flex items-center">
              <BrandLogo size="md" />
            </a>
          </div>

          {/* Center Navigation Bar */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <button
              onClick={() => handleToolClick("merge-pdf")}
              className="px-3 py-1.5 rounded-xl hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-xs font-semibold cursor-pointer"
            >
              Merge PDF
            </button>
            <button
              onClick={() => handleToolClick("split-pdf")}
              className="px-3 py-1.5 rounded-xl hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-xs font-semibold cursor-pointer"
            >
              Split PDF
            </button>
            <button
              onClick={() => handleToolClick("compress-pdf")}
              className="px-3 py-1.5 rounded-xl hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-xs font-semibold cursor-pointer"
            >
              Compress PDF
            </button>

            {/* Quick Convert Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsConvertDropdownOpen(!isConvertDropdownOpen);
                  setIsMegaMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-colors text-xs font-semibold cursor-pointer ${
                  isConvertDropdownOpen
                    ? "text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800"
                    : "hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <span>Convert</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 text-zinc-400 ${
                    isConvertDropdownOpen ? "rotate-180 text-zinc-700 dark:text-zinc-200" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isConvertDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={motionTokens.spring.snappy}
                    className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xl p-2 z-50 text-left"
                  >
                    <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 px-3 py-1 font-mono uppercase tracking-wider">
                      Convert To PDF
                    </div>
                    {[
                      { id: "jpg-to-pdf", name: "JPG to PDF", icon: ImageIcon, color: "text-amber-500" },
                      { id: "word-to-pdf", name: "Word to PDF", icon: FileText, color: "text-blue-500" },
                      { id: "powerpoint-to-pdf", name: "PowerPoint to PDF", icon: Presentation, color: "text-amber-500" },
                      { id: "excel-to-pdf", name: "Excel to PDF", icon: FileSpreadsheet, color: "text-emerald-500" },
                      { id: "html-to-pdf", name: "HTML to PDF", icon: FileCode2, color: "text-amber-500" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToolClick(item.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                      >
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span>{item.name}</span>
                      </button>
                    ))}

                    <div className="my-1.5 border-t border-zinc-100 dark:border-zinc-800" />

                    <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 px-3 py-1 font-mono uppercase tracking-wider">
                      Convert From PDF
                    </div>
                    {[
                      { id: "pdf-to-jpg", name: "PDF to JPG", icon: ImageIcon, color: "text-amber-500" },
                      { id: "pdf-to-word", name: "PDF to Word", icon: FileText, color: "text-blue-500" },
                      { id: "pdf-to-excel", name: "PDF to Excel", icon: FileSpreadsheet, color: "text-emerald-500" },
                      { id: "pdf-to-markdown", name: "PDF to Clean Markdown (AI)", icon: Sparkles, color: "text-emerald-500" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToolClick(item.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                      >
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mega Menu Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsMegaMenuOpen(!isMegaMenuOpen);
                setIsConvertDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isMegaMenuOpen
                  ? "border-zinc-950 dark:border-white text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800 shadow-2xs"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs"
              }`}
            >
              <span>All Tools</span>
              {isMegaMenuOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-950 dark:text-white" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>
          </nav>

          {/* Action Buttons & Auth (Perfect vertical alignment) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 3-State Theme Switcher: System (Default), Light, Dark - Only Icons */}
            <div
              className="inline-flex items-center p-0.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-2xs"
              role="group"
              aria-label="Color theme switcher"
            >
              {/* System Theme (Default) */}
              <button
                type="button"
                onClick={() => setThemeMode("system")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${
                  themeMode === "system"
                    ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
                title="System (Default)"
                aria-label="System theme (Default)"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>

              {/* Light Mode */}
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${
                  themeMode === "light"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
                title="Light Mode"
                aria-label="Light mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>

              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${
                  themeMode === "dark"
                    ? "bg-zinc-950 dark:bg-zinc-800 text-indigo-400 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
                title="Dark Mode"
                aria-label="Dark mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {user ? (
              /* User Profile Pill & Dropdown */
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="h-9 flex items-center gap-2 pl-2 pr-2.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all cursor-pointer shadow-2xs group"
                  aria-label="User account menu"
                  aria-expanded={isUserMenuOpen}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 shrink-0 shadow-2xs group-hover:ring-zinc-400 dark:group-hover:ring-zinc-500 transition-all"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-black flex items-center justify-center shrink-0 shadow-2xs font-sans-display">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-zinc-900 dark:text-white max-w-[90px] sm:max-w-[120px] truncate font-sans-display">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform duration-200 shrink-0 ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={motionTokens.spring.snappy}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xl p-2 z-50 text-left overflow-hidden"
                    >
                      {/* User Identity Header Card */}
                      <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/60 mb-1.5">
                        <div className="flex items-center gap-2.5">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-black flex items-center justify-center shrink-0 shadow-2xs font-sans-display">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-950 dark:text-white truncate font-sans-display leading-tight">
                              {user.name}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Membership Badge */}
                        <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Plan</span>
                          {user.plan === "pro" || isPro ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-sans-display">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Pro Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-200/70 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300">
                              Free Explorer
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu Actions */}
                      <div className="space-y-0.5">
                        {!(user.plan === "pro" || isPro) && (
                          <>
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenPricing();
                              }}
                              className="w-full text-left flex items-center justify-between px-2.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Upgrade to Pro
                              </span>
                              <span className="text-[11px] font-mono opacity-80">from ₹49</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenLicenseModal();
                              }}
                              className="w-full text-left flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Activate License Key</span>
                            </button>
                            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                          </>
                        )}

                        {/* Sign Out Button */}
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Guest Actions: Log In & Sign Up & Pro Pass CTA */
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal("login")}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Log In
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuthModal("signup")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs transition-colors cursor-pointer"
                >
                  Sign Up
                </button>

                <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-zinc-800 my-auto mx-0.5" />

                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-400/20 border border-amber-500/30 dark:border-amber-400/30 shadow-xs transition-all cursor-pointer font-sans-display"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>Quick Pass (₹49)</span>
                </button>
              </>
            )}

            {/* Mobile Navigation Hamburger Toggle (lg:hidden) */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setIsMegaMenuOpen(false);
                setIsConvertDropdownOpen(false);
              }}
              className="p-2 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white lg:hidden cursor-pointer shadow-2xs transition-all flex items-center justify-center shrink-0"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Absolute Floating Mega-Menu Panel (4-Column Zero-Truncation Layout with Backdrop Overlay) */}
      <AnimatePresence>
        {isMegaMenuOpen && (
          <>
            {/* Fixed Backdrop Dimmer (Prevents background interference, closes on outside click) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsMegaMenuOpen(false)}
              className="fixed inset-0 top-16 bg-black/30 dark:bg-black/60 backdrop-blur-xs z-40"
            />

            {/* Absolute Floating Mega-Menu (Does NOT push down page in document flow) */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease.standard }}
              className="absolute top-full left-0 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-b border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl z-50 overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    title: "Organize & Pages",
                    dotColor: "bg-rose-500",
                    tools: [
                      { id: "merge-pdf", name: "Merge PDF", badge: "Popular" },
                      { id: "split-pdf", name: "Split PDF", badge: "Popular" },
                      { id: "rotate-pdf", name: "Rotate PDF", badge: "Popular" },
                      { id: "remove-pages", name: "Remove Pages" },
                      { id: "extract-pages", name: "Extract Pages" },
                      { id: "organize-pdf", name: "Organize & Reorder" },
                      { id: "scan-to-pdf", name: "Scan to PDF" },
                    ],
                  },
                  {
                    title: "Optimize & Edit",
                    dotColor: "bg-emerald-500",
                    tools: [
                      { id: "compress-pdf", name: "Compress PDF", badge: "Popular" },
                      { id: "edit-pdf", name: "Edit & Annotate", badge: "Popular" },
                      { id: "repair-pdf", name: "Repair Corrupt PDF" },
                      { id: "ocr-pdf", name: "OCR Text Layer Audit", badge: "Pro" },
                      { id: "add-page-numbers", name: "Add Page Numbers" },
                      { id: "add-watermark", name: "Add Watermark" },
                      { id: "crop-pdf", name: "Crop PDF" },
                      { id: "pdf-forms", name: "Flatten PDF Forms" },
                    ],
                  },
                  {
                    title: "Convert Studio",
                    dotColor: "bg-amber-500",
                    tools: [
                      { id: "word-to-pdf", name: "Word to PDF (.docx)" },
                      { id: "excel-to-pdf", name: "Excel to PDF (.xlsx)" },
                      { id: "jpg-to-pdf", name: "JPG & PNG to PDF", badge: "Popular" },
                      { id: "html-to-pdf", name: "HTML to PDF" },
                      { id: "pdf-to-word", name: "PDF to Word (.docx)" },
                      { id: "pdf-to-excel", name: "PDF to Excel (.xlsx)" },
                      { id: "pdf-to-jpg", name: "PDF to Images", badge: "Popular" },
                      { id: "pdf-to-pdfa", name: "PDF to PDF/A Archive" },
                    ],
                  },
                  {
                    title: "Security & Intelligence",
                    dotColor: "bg-sky-500",
                    tools: [
                      { id: "pdf-to-markdown", name: "PDF to Markdown", badge: "AI" },
                      { id: "ai-summarizer", name: "AI & NLP Summary", badge: "AI" },
                      { id: "translate-pdf", name: "Translate Layout", badge: "AI" },
                      { id: "sign-pdf", name: "Digital Signatures", badge: "Popular" },
                      { id: "redact-pdf", name: "Redact & Blackout" },
                      { id: "protect-pdf", name: "Protect with Password" },
                      { id: "unlock-pdf", name: "Unlock Password PDF" },
                      { id: "compare-pdf", name: "Compare Two PDFs" },
                    ],
                  },
                ].map((col, idx) => (
                  <div key={idx} className="space-y-3">
                    {/* Category Header */}
                    <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-200/70 dark:border-zinc-800/70">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor} shrink-0`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-zinc-100 font-sans-display">
                        {col.title}
                      </span>
                    </div>

                    {/* Tool Items with Spacious Rows and Zero Truncation */}
                    <ul className="space-y-1">
                      {col.tools.map((tool) => (
                        <li key={tool.id}>
                          <button
                            type="button"
                            onClick={() => handleToolClick(tool.id)}
                            className="w-full text-left flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 px-2.5 py-1.5 rounded-xl transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:scale-105 transition-transform">
                                {getToolItemIcon(tool.id)}
                              </span>
                              <span className="font-sans-display truncate group-hover:translate-x-0.5 transition-transform">
                                {tool.name}
                              </span>
                            </span>
                            {tool.badge && renderToolBadge(tool.badge)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Bottom Bar */}
              <div className="bg-zinc-50 dark:bg-zinc-900/90 px-6 sm:px-8 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 gap-2">
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold font-sans">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  100% Client-Side Engine • Zero Server File Uploads • In-Browser RAM
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  30 Local Instruments Available
                </span>
              </div>
            </motion.div>
          </>
        )}

        {/* Mobile Navigation Drawer Overlay (for screens < lg) */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop Dimmer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 top-16 bg-black/40 dark:bg-black/75 backdrop-blur-xs z-40 lg:hidden"
            />

            {/* Slide-Down Navigation Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease.standard }}
              className="absolute top-full left-0 w-full bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 max-h-[calc(100vh-4.5rem)] overflow-y-auto lg:hidden text-left"
            >
              <div className="p-4 sm:p-6 space-y-6">
                {/* 1. Quick Featured Instruments */}
                <div>
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center justify-between">
                    <span>Featured Instruments</span>
                    <span className="text-emerald-600 dark:text-emerald-400">100% In-RAM</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "pdf-to-markdown", name: "PDF to Markdown", icon: Sparkles, color: "text-amber-500", badge: "AI" },
                      { id: "merge-pdf", name: "Merge PDF", icon: Layers, color: "text-rose-500", badge: "Popular" },
                      { id: "split-pdf", name: "Split PDF", icon: Scissors, color: "text-rose-500", badge: "Popular" },
                      { id: "compress-pdf", name: "Compress PDF", icon: Zap, color: "text-emerald-500", badge: "Popular" },
                      { id: "sign-pdf", name: "Sign PDF", icon: PenTool, color: "text-sky-500", badge: "Seal" },
                      { id: "redact-pdf", name: "Redact PDF", icon: EyeOff, color: "text-sky-500", badge: "Secure" },
                    ].map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleToolClick(tool.id)}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer min-h-[48px]"
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${tool.color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                              {tool.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Full Suite Categorized Sections */}
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    All Tool Suites
                  </div>

                  {/* Organize & Pages */}
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Organize &amp; Pages
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 pl-3">
                      {[
                        { id: "merge-pdf", name: "Merge PDF" },
                        { id: "split-pdf", name: "Split PDF" },
                        { id: "rotate-pdf", name: "Rotate PDF" },
                        { id: "remove-pages", name: "Remove Pages" },
                        { id: "organize-pdf", name: "Organize PDF" },
                        { id: "extract-pages", name: "Extract Pages" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToolClick(t.id)}
                          className="text-left text-xs py-1.5 px-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer truncate"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Convert Suite */}
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      Convert Formats
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 pl-3">
                      {[
                        { id: "jpg-to-pdf", name: "JPG to PDF" },
                        { id: "word-to-pdf", name: "Word to PDF" },
                        { id: "excel-to-pdf", name: "Excel to PDF" },
                        { id: "pdf-to-jpg", name: "PDF to JPG" },
                        { id: "pdf-to-word", name: "PDF to Word" },
                        { id: "pdf-to-excel", name: "PDF to Excel" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToolClick(t.id)}
                          className="text-left text-xs py-1.5 px-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer truncate"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Security & Intelligence */}
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      Security &amp; Intelligence
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 pl-3">
                      {[
                        { id: "sign-pdf", name: "Sign PDF" },
                        { id: "redact-pdf", name: "Redact PDF" },
                        { id: "protect-pdf", name: "Protect PDF" },
                        { id: "unlock-pdf", name: "Unlock PDF" },
                        { id: "ai-summarizer", name: "AI Summarizer" },
                        { id: "translate-pdf", name: "Translate PDF" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToolClick(t.id)}
                          className="text-left text-xs py-1.5 px-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer truncate"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Action CTAs */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenPricing();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer font-sans-display"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Get Affordable Passes (from ₹49)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      const el = document.getElementById("all-tools");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Browse All 20+ Tools</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4. Privacy Footer Note */}
                <div className="pt-2 text-center">
                  <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>100% In-Browser Memory • Zero Uploads</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
