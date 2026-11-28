"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  Smartphone,
  QrCode,
  Share2,
  Copy,
  Check,
  X,
  FileText,
  Upload,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  CheckCircle2,
  Laptop,
} from "lucide-react";
import { generateQrSvg } from "@/lib/qr-code";
import { setChainedDocument } from "@/lib/pdf-tools/chained-document";

interface PhoneTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFile?: File | null;
  onReceiveFile?: (file: File) => void;
}

export function PhoneTransferModal({
  isOpen,
  onClose,
  currentFile = null,
  onReceiveFile,
}: PhoneTransferModalProps) {
  const [activeTab, setActiveTab] = useState<"send" | "receive">("send");
  const [roomId, setRoomId] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [transferStatus, setTransferStatus] = useState<"waiting" | "connected" | "done">("waiting");
  const [qrSvg, setQrSvg] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      // Generate clean room code & 6-digit PIN
      const room = "drop-" + Math.random().toString(36).substring(2, 8);
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomId(room);
      setPinCode(pin);

      const targetUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/?room=${room}&pin=${pin}#p2p-transfer`
          : `https://docdrop.com/?room=${room}`;

      const svg = generateQrSvg(targetUrl, 220);
      setQrSvg(svg);
      setTransferStatus("waiting");
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?room=${roomId}&pin=${pinCode}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "DocDrop Document Transfer",
          text: `Transferring ${currentFile ? currentFile.name : "document"} securely via DocDrop`,
          url: `${window.location.origin}/?room=${roomId}`,
        });
      } catch (err) {
        console.debug("Share dismissed", err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Simulate instant P2P handoff confirmation
  const handleSimulateHandoff = () => {
    setTransferStatus("connected");
    setTimeout(() => {
      setTransferStatus("done");
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch {}
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg rounded-3xl bg-[var(--surface)]/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Drop to Phone (P2P Transfer)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Pass documents directly to your mobile phone with zero cloud storage.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("send")}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "send"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Send to Phone</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("receive")}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "receive"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Receive from Phone</span>
              </button>
            </div>

            {/* Tab 1: Send to Phone */}
            {activeTab === "send" && (
              <div className="space-y-4">
                {/* Active Document Card */}
                {currentFile ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                          {currentFile.name}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-400">
                          {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                      Ready in RAM
                    </span>
                  </div>
                ) : (
                  <div className="p-3 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-500">
                    Scan the QR code to pair your phone and transfer files directly.
                  </div>
                )}

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                  <div className="w-52 h-52 p-3 rounded-2xl bg-white text-zinc-950 border border-zinc-200 shadow-inner flex items-center justify-center">
                    <div
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                      className="w-full h-full text-zinc-950 flex items-center justify-center"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Scan with your phone&apos;s camera
                    </p>
                    <p className="text-[11px] font-mono text-zinc-400">
                      Pairing PIN: <strong className="text-amber-500 font-bold">{pinCode}</strong>
                    </p>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Direct WebRTC Local Channel</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Receive from Phone */}
            {activeTab === "receive" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Camera Scan to Laptop Transfer</span>
                  </p>
                  <p className="text-[11px] opacity-90">
                    Snap a photo of any printed contract or notes on your phone and beam it straight to your laptop studio.
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                  <div className="w-48 h-48 p-3 rounded-2xl bg-white text-zinc-950 border border-zinc-200 shadow-inner flex items-center justify-center">
                    <div
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                      className="w-full h-full text-zinc-950 flex items-center justify-center"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Scan to open Phone Uploader
                    </p>
                    <p className="text-[11px] font-mono text-zinc-400">
                      Room: <span className="text-zinc-600 dark:text-zinc-300">{roomId}</span>
                    </p>
                  </div>
                </div>

                {/* Handoff Test Trigger */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-mono">
                    Status: {transferStatus === "waiting" ? "Waiting for mobile..." : "Transferring..."}
                  </span>
                  <button
                    type="button"
                    onClick={handleSimulateHandoff}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Test Local Handoff
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
