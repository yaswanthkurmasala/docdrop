"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ConverterWorkspace } from "@/components/ConverterWorkspace";
import { MergePdfTool } from "@/components/tools/MergePdfTool";
import { UniversalPdfTool } from "@/components/tools/UniversalPdfTool";
import { ToolsHub } from "@/components/ToolsHub";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Layers, Scissors, Zap, RotateCw, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";
import { TOOLS_REGISTRY } from "@/lib/tools-registry";

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

  const { user, setProStatus } = useAuth();

  // Sync pro status from context or localStorage on mount & handle payment return
  useEffect(() => {
    try {
      const savedPro =
        localStorage.getItem("docdrop_pro_unlocked") ||
        localStorage.getItem("doctomd_pro_unlocked");
      if (savedPro === "true" || user?.plan === "pro") {
        setIsPro(true);
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
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
  }, [user]);

  const handleUnlockPro = () => {
    setIsPro(true);
    setProStatus(true);
    try {
      localStorage.setItem("docdrop_pro_unlocked", "true");
    } catch {
      // ignore
    }
  };

  const handleOpenPricing = () => {
    const el = document.getElementById("pricing");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
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
    const el = document.getElementById("active-tool-workspace");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const isPresetDock = [
    "pdf-to-markdown",
    "merge-pdf",
    "split-pdf",
    "rotate-pdf",
    "compress-pdf",
    "jpg-to-pdf",
  ].includes(activeToolId);

  const activeDef = TOOLS_REGISTRY.find((t) => t.id === activeToolId);

  const effectiveIsPro = isPro || user?.plan === "pro";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-subtle)]">
      {/* Navigation Header with Mega-Menu & Auth */}
      <Header
        onOpenPricing={handleOpenPricing}
        onOpenLicenseModal={handleOpenLicenseModal}
        onSelectTool={handleSelectTool}
        onOpenAuthModal={handleOpenAuthModal}
        isPro={effectiveIsPro}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
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

        {/* Active Tool Workspace Shell */}
        <section
          id="active-tool-workspace"
          className="scroll-mt-20 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        >
          <h2 className="sr-only">Document Workbench &amp; Active Instrument</h2>

          {/* Refined Dock-Style Tool Switcher with Responsive Touch Scroll */}
          <div className="w-full overflow-x-auto no-scrollbar py-1 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center justify-start sm:justify-center gap-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-zinc-200/90 dark:border-zinc-800 shadow-2xs w-max min-w-full sm:min-w-0 sm:w-auto mx-auto relative">
              {[
                {
                  id: "pdf-to-markdown",
                  label: "PDF to Markdown",
                  icon: Sparkles,
                  iconColor: "text-zinc-900 dark:text-zinc-100",
                },
                {
                  id: "merge-pdf",
                  label: "Merge PDF",
                  icon: Layers,
                  iconColor: "text-zinc-700 dark:text-zinc-300",
                },
                {
                  id: "split-pdf",
                  label: "Split PDF",
                  icon: Scissors,
                  iconColor: "text-zinc-700 dark:text-zinc-300",
                },
                {
                  id: "rotate-pdf",
                  label: "Rotate PDF",
                  icon: RotateCw,
                  iconColor: "text-zinc-700 dark:text-zinc-300",
                },
                {
                  id: "compress-pdf",
                  label: "Compress PDF",
                  icon: Zap,
                  iconColor: "text-zinc-700 dark:text-zinc-300",
                },
                {
                  id: "jpg-to-pdf",
                  label: "JPG to PDF",
                  icon: ImageIcon,
                  iconColor: "text-zinc-700 dark:text-zinc-300",
                },
              ].map((tool) => {
                const Icon = tool.icon;
                const isActive = activeToolId === tool.id;

                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveToolId(tool.id)}
                    className={`relative z-10 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap min-h-[38px] ${
                      isActive
                        ? "text-white dark:text-zinc-950 font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDockPill"
                        transition={motionTokens.spring.snappy}
                        className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl shadow-xs -z-10"
                      />
                    )}
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}

              {!isPresetDock && activeDef && (
                <button className="relative z-10 px-3.5 py-2 rounded-xl text-xs font-bold text-white dark:text-zinc-950 flex items-center gap-2 whitespace-nowrap min-h-[38px]">
                  <motion.div
                    layoutId="activeDockPill"
                    transition={motionTokens.spring.snappy}
                    className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl shadow-xs -z-10"
                  />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{activeDef.name}</span>
                </button>
              )}

              <button
                onClick={() => {
                  const el = document.getElementById("all-tools");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
              >
                All Tools &darr;
              </button>
            </div>
          </div>

          {/* Active Tool View with Fluid Spring Transitions */}
          <AnimatePresence mode="wait">
            {activeToolId === "merge-pdf" ? (
              <motion.div
                key="merge-pdf-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: motionTokens.duration.standard }}
              >
                <MergePdfTool isPro={effectiveIsPro} onOpenPricing={handleOpenPricing} />
              </motion.div>
            ) : activeToolId === "pdf-to-markdown" ? (
              <motion.div
                key="markdown-converter-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: motionTokens.duration.standard }}
              >
                <ConverterWorkspace isPro={effectiveIsPro} onOpenPricing={handleOpenPricing} />
              </motion.div>
            ) : (
              <motion.div
                key={`universal-tool-${activeToolId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: motionTokens.duration.standard }}
              >
                <UniversalPdfTool
                  toolId={activeToolId}
                  isPro={effectiveIsPro}
                  onOpenPricing={handleOpenPricing}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

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
      <Footer />

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
    </div>
  );
}
