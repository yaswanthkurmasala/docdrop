"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ConverterWorkspace } from "@/components/ConverterWorkspace";
import { MergePdfTool } from "@/components/tools/MergePdfTool";
import { VisualPageOrganizerTool } from "@/components/tools/VisualPageOrganizerTool";
import { UniversalPdfTool } from "@/components/tools/UniversalPdfTool";
import { VideoDownloaderTool } from "@/components/tools/VideoDownloaderTool";
import { ToolsHub } from "@/components/ToolsHub";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Layers, Scissors, Zap, RotateCw, Image as ImageIcon, Search, Video, LayoutGrid, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";
import { TOOLS_REGISTRY } from "@/lib/tools-registry";
import { GlobalDropzone } from "@/components/GlobalDropzone";
import { CommandPalette } from "@/components/CommandPalette";
import { DocumentChatDrawer } from "@/components/DocumentChatDrawer";
import { PhoneTransferModal } from "@/components/PhoneTransferModal";
import { setChainedDocument } from "@/lib/pdf-tools/chained-document";
import { MessageSquare, Smartphone } from "lucide-react";

interface DocDropStudioProps {
  initialToolId?: string;
  toolHero?: React.ReactNode;
  toolSeoContent?: React.ReactNode;
}

export function DocDropStudio({
  initialToolId = "pdf-to-markdown",
  toolHero,
  toolSeoContent,
}: DocDropStudioProps) {
  const [isPro, setIsPro] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string } | null>(null);
  const [activeToolId, setActiveToolId] = useState<string>(initialToolId);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneModalCurrentFile, setPhoneModalCurrentFile] = useState<File | null>(null);

  // Global listener for "Send to Phone" from any tool
  useEffect(() => {
    const handleOpenPhoneTransfer = (e: any) => {
      if (e.detail?.file) {
        setPhoneModalCurrentFile(e.detail.file);
      }
      setIsPhoneModalOpen(true);
    };
    window.addEventListener("docdrop:open-phone-transfer", handleOpenPhoneTransfer);
    return () => window.removeEventListener("docdrop:open-phone-transfer", handleOpenPhoneTransfer);
  }, []);

  const handleReceiveFileFromPhone = (file: File) => {
    setPhoneModalCurrentFile(file);
    setChainedDocument(file);
  };

  const { user, setProStatus } = useAuth();

  // Global Keyboard Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUnlockPro = useCallback(() => {
    setIsPro(true);
    setProStatus(true);
    try {
      localStorage.setItem("docdrop_pro_unlocked", "true");
    } catch {
      // ignore
    }
  }, [setProStatus]);

  const scrollToSection = useCallback((sectionId: string) => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, []);

  // Sync pro status on mount, verify Cashfree redirect payment, and honor deep-link URL hashes
  useEffect(() => {
    let unlockedLocal = false;
    try {
      const savedPro =
        localStorage.getItem("docdrop_pro_unlocked") ||
        localStorage.getItem("doctomd_pro_unlocked");
      if (savedPro === "true" || user?.plan === "pro") {
        unlockedLocal = true;
      }
    } catch {
      // ignore
    }

    if (unlockedLocal) {
      queueMicrotask(() => setIsPro(true));
    }

    if (typeof window !== "undefined") {
      if (window.location.hash) {
        const targetId = window.location.hash.replace(/^#/, "");
        setTimeout(() => scrollToSection(targetId), 120);
      }

      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("order_id");
      const shouldVerify = params.get("verify_payment") === "1";

      if (shouldVerify && orderId) {
        fetch("/api/cashfree/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.verified === true && data.orderStatus === "PAID") {
              handleUnlockPro();
            }
          })
          .catch(() => {})
          .finally(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      }
    }
  }, [user, handleUnlockPro, scrollToSection]);

  const handleOpenPricing = () => {
    const el = document.getElementById("pricing");
    if (el) {
      scrollToSection("pricing");
    } else {
      setSelectedPlan({ name: "Quick Pass (48h)", price: "₹49" });
      setIsCheckoutOpen(true);
    }
  };

  const handleOpenLicenseModal = () => {
    setSelectedPlan({ name: "License Activation", price: "₹49" });
    setIsCheckoutOpen(true);
  };

  const handleOpenAuthModal = (tab: "login" | "signup" = "login") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleSelectPlan = (name: string, price: string) => {
    setSelectedPlan({ name, price });
    setIsCheckoutOpen(true);
  };

  const handleSelectTool = (toolId: string) => {
    setActiveToolId(toolId);
    setTimeout(() => scrollToSection("active-tool-workspace"), 50);
  };

  const isPresetDock = [
    "pdf-to-markdown",
    "merge-pdf",
    "organize-pdf",
    "split-pdf",
    "rotate-pdf",
    "compress-pdf",
    "jpg-to-pdf",
    "video-downloader",
  ].includes(activeToolId);

  const activeDef = TOOLS_REGISTRY.find((t) => t.id === activeToolId);

  const effectiveIsPro = isPro || user?.plan === "pro";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-subtle)] relative">
      {/* Sleek Top Luminous Boot Beam on Website Load */}
      <motion.div
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: [1, 1, 0] }}
        transition={{ duration: 0.85, times: [0, 0.75, 1], ease: [0.16, 1, 0.3, 1] }}
        style={{ originX: 0 }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-emerald-400 to-indigo-500 z-[100] pointer-events-none shadow-[0_0_12px_rgba(245,158,11,0.6)]"
      />

      {/* Global In-Browser Drag-and-Drop Ingestion */}
      <GlobalDropzone onSelectTool={handleSelectTool} />

      {/* Navigation Header with Mega-Menu & Auth */}
      <Header
        onOpenPricing={handleOpenPricing}
        onOpenLicenseModal={handleOpenLicenseModal}
        onSelectTool={handleSelectTool}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isPro={effectiveIsPro}
      />

      {/* Global ⌘K Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTool={handleSelectTool}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full overflow-x-hidden">
        {/* Render Dedicated Tool SEO Hero OR Default Homepage Hero */}
        {toolHero ? (
          toolHero
        ) : (
          <Hero
            onStartClick={() => {
              const el = document.getElementById("active-tool-workspace");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            onPricingClick={handleOpenPricing}
          />
        )}

        {/* Active Tool Workspace Shell with Apple-grade Dock Entrance */}
        <motion.section
          id="active-tool-workspace"
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="scroll-mt-20 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        >
          <h2 className="sr-only">Document Workbench &amp; Active Instrument</h2>

          {/* Refined Dock-Style Tool Switcher: Tightly shrink-wrapped, centered, with ambient blur light glow */}
          <div className="w-full flex items-center justify-start xl:justify-center py-2 mb-8 overflow-x-auto no-scrollbar px-2 sm:px-4">
            <div className="relative inline-flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.35)] shrink-0 mx-auto">
              {/* Subtle ambient light blur behind dock */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/15 rounded-2xl blur-md opacity-60 pointer-events-none -z-10" />

              {[
                {
                  id: "pdf-to-markdown",
                  label: "PDF to Markdown",
                  icon: Sparkles,
                  iconColor: "text-amber-500 dark:text-amber-400",
                },
                {
                  id: "merge-pdf",
                  label: "Merge PDF",
                  icon: Layers,
                  iconColor: "text-indigo-500 dark:text-indigo-400",
                },
                {
                  id: "split-pdf",
                  label: "Split PDF",
                  icon: Scissors,
                  iconColor: "text-sky-500 dark:text-sky-400",
                },
                {
                  id: "organize-pdf",
                  label: "Organize Pages",
                  icon: LayoutGrid,
                  iconColor: "text-rose-500 dark:text-rose-400",
                },
                {
                  id: "rotate-pdf",
                  label: "Rotate PDF",
                  icon: RotateCw,
                  iconColor: "text-emerald-500 dark:text-emerald-400",
                },
                {
                  id: "compress-pdf",
                  label: "Compress PDF",
                  icon: Zap,
                  iconColor: "text-amber-500 dark:text-amber-400",
                },
                {
                  id: "jpg-to-pdf",
                  label: "JPG to PDF",
                  icon: ImageIcon,
                  iconColor: "text-blue-500 dark:text-blue-400",
                },
                {
                  id: "video-downloader",
                  label: "Video Downloader",
                  icon: Video,
                  iconColor: "text-violet-500 dark:text-violet-400",
                },
              ].map((tool) => {
                const Icon = tool.icon;
                const isActive = activeToolId === tool.id;

                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveToolId(tool.id)}
                    className={`relative z-10 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap min-h-[36px] ${
                      isActive
                        ? "text-zinc-950 dark:text-zinc-950 font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDockPill"
                        transition={motionTokens.spring.snappy}
                        className="absolute inset-0 bg-white dark:bg-white rounded-xl shadow-xs border border-zinc-200/60 dark:border-white/20 -z-10"
                      />
                    )}
                    <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-zinc-950" : tool.iconColor}`} />
                    <span>{tool.label}</span>
                  </button>
                );
              })}

              {!isPresetDock && activeDef && (
                <button className="relative z-10 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-950 dark:text-zinc-950 flex items-center gap-2 whitespace-nowrap min-h-[36px]">
                  <motion.div
                    layoutId="activeDockPill"
                    transition={motionTokens.spring.snappy}
                    className="absolute inset-0 bg-white dark:bg-white rounded-xl shadow-xs border border-zinc-200/60 dark:border-white/20 -z-10"
                  />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{activeDef.name}</span>
                </button>
              )}

              <div className="h-4 w-px bg-zinc-200/80 dark:bg-zinc-800 mx-1 shrink-0" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px] shrink-0"
                title="Search and jump to any tool (⌘K / Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="hidden sm:inline">Jump</span>
                <kbd className="px-1 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-[9px] font-mono text-zinc-500 dark:text-zinc-400">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("all-tools");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap min-h-[36px] flex items-center gap-1 shrink-0"
              >
                <span>All Tools</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Active Tool View with Fluid Spring Transitions */}
          <AnimatePresence mode="wait">
            {activeToolId === "merge-pdf" ? (
              <motion.div
                key="merge-pdf-view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: motionTokens.ease.standard }}
                className="will-change-[transform,opacity]"
              >
                <MergePdfTool isPro={effectiveIsPro} onOpenPricing={handleOpenPricing} />
              </motion.div>
            ) : activeToolId === "organize-pdf" ? (
              <motion.div
                key="organize-pdf-view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: motionTokens.ease.standard }}
                className="will-change-[transform,opacity]"
              >
                <VisualPageOrganizerTool
                  isPro={effectiveIsPro}
                  onOpenPricing={handleOpenPricing}
                  onChainTool={(toolId) => handleSelectTool(toolId)}
                />
              </motion.div>
            ) : activeToolId === "video-downloader" ? (
              <motion.div
                key="video-downloader-view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: motionTokens.ease.standard }}
                className="will-change-[transform,opacity]"
              >
                <VideoDownloaderTool isPro={effectiveIsPro} onOpenPricing={handleOpenPricing} />
              </motion.div>
            ) : activeToolId === "pdf-to-markdown" ? (
              <motion.div
                key="markdown-converter-view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: motionTokens.ease.standard }}
                className="will-change-[transform,opacity]"
              >
                <ConverterWorkspace isPro={effectiveIsPro} onOpenPricing={handleOpenPricing} />
              </motion.div>
            ) : (
              <motion.div
                key={`universal-tool-${activeToolId}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: motionTokens.ease.standard }}
                className="will-change-[transform,opacity]"
              >
                <UniversalPdfTool
                  toolId={activeToolId}
                  isPro={effectiveIsPro}
                  onOpenPricing={handleOpenPricing}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Optional Dedicated Tool SEO Section (How-to, FAQ, Related Tools) */}
        {toolSeoContent}

        {/* All PDF Tools Category Hub & Search */}
        <ToolsHub onSelectTool={handleSelectTool} activeToolId={activeToolId} />

        {/* Features & Comparison */}
        {!toolHero && <Features />}

        {/* Affordable Pricing Section */}
        <Pricing onSelectPlan={handleSelectPlan} isPro={effectiveIsPro} />

        {/* General FAQ Section */}
        {!toolSeoContent && <Faq />}
      </main>

      {/* Footer */}
      <Footer onOpenPricing={handleOpenPricing} />

      {/* Checkout / License Key Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedPlan={selectedPlan}
        onUnlockPro={handleUnlockPro}
      />

      {/* Sign In / Log In Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        onOpenLicenseModal={handleOpenLicenseModal}
      />

      {/* AI Chat with PDF & Table Extractor Drawer */}
      <DocumentChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
      />

      {/* Peer-to-Peer Drop to Phone Modal */}
      <PhoneTransferModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        currentFile={phoneModalCurrentFile}
        onReceiveFile={handleReceiveFileFromPhone}
      />

      {/* Floating Quick Action Instruments: Chat with PDF & Drop to Phone */}
      <div className="fixed bottom-5 left-5 z-40 hidden sm:flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsChatDrawerOpen(true)}
          className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer backdrop-blur-md"
          title="Chat with your loaded document or extract tables to Excel"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat with PDF</span>
          <span className="px-1.5 py-0.2 rounded bg-indigo-800 text-[10px] font-mono">AI</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPhoneModalOpen(true)}
          className="px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold border border-zinc-200/90 dark:border-zinc-800 shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer backdrop-blur-md"
          title="Transfer documents directly between phone and laptop"
        >
          <Smartphone className="w-4 h-4 text-amber-500" />
          <span>Drop to Phone</span>
        </button>
      </div>
    </div>
  );
}
