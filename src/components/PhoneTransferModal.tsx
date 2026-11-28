"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Wifi,
  ExternalLink,
  Edit2,
} from "lucide-react";
import { generateQrDataUrl } from "@/lib/qr-code";
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);
  const [effectiveOrigin, setEffectiveOrigin] = useState<string>("");
  const [isEditingOrigin, setIsEditingOrigin] = useState<boolean>(false);
  const [customOriginInput, setCustomOriginInput] = useState<string>("");
  const [receivedFile, setReceivedFile] = useState<File | null>(null);

  // Initialize room, PIN, and detect LAN Wi-Fi IP for seamless local phone scanning
  const initTransferSession = useCallback(async () => {
    setIsGeneratingQr(true);
    const room = "drop-" + Math.random().toString(36).substring(2, 8);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(room);
    setPinCode(pin);

    let baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://docdrop.com";

    // If running on local computer, query local LAN Wi-Fi IPv4 so phone on Wi-Fi can reach it!
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      try {
        const res = await fetch("/api/p2p/network-ip");
        const data = await res.json();
        if (data.ip && data.ip !== "127.0.0.1") {
          const port = window.location.port ? `:${window.location.port}` : "";
          baseOrigin = `http://${data.ip}${port}`;
        }
      } catch (err) {
        console.warn("[P2P] Network IP auto-detection fallback:", err);
      }
    }

    setEffectiveOrigin(baseOrigin);
    setCustomOriginInput(baseOrigin);

    const targetUrl = `${baseOrigin}/?room=${room}&pin=${pin}#p2p-transfer`;
    try {
      const dataUrl = await generateQrDataUrl(targetUrl, 280);
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("[P2P] QR generation error:", err);
    } finally {
      setIsGeneratingQr(false);
      setTransferStatus("waiting");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      initTransferSession();
    }
  }, [isOpen, initTransferSession]);

  // Re-generate QR when user customizes origin
  const handleApplyCustomOrigin = async () => {
    if (!customOriginInput.trim()) return;
    setIsGeneratingQr(true);
    setEffectiveOrigin(customOriginInput.trim());
    setIsEditingOrigin(false);

    const targetUrl = `${customOriginInput.trim()}/?room=${roomId}&pin=${pinCode}#p2p-transfer`;
    try {
      const dataUrl = await generateQrDataUrl(targetUrl, 280);
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("[P2P] QR generation error:", err);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const getFullPairingUrl = () => {
    return `${effectiveOrigin}/?room=${roomId}&pin=${pinCode}#p2p-transfer`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullPairingUrl());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "DocDrop Document Transfer",
          text: `Connect and transfer files directly via DocDrop (PIN: ${pinCode})`,
          url: getFullPairingUrl(),
        });
      } catch (err) {
        console.debug("Share dismissed", err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Simulate local Wi-Fi handoff or upload directly
  const handleSimulateHandoff = () => {
    setTransferStatus("connected");
    setTimeout(() => {
      setTransferStatus("done");
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch {}
    }, 1000);
  };

  // Test mobile file upload simulation
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setReceivedFile(f);
      setTransferStatus("done");
      setChainedDocument(f);
      if (onReceiveFile) onReceiveFile(f);

      try {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.7 } });
      } catch {}
    }
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
                    Scan with any smartphone camera to connect with zero cloud storage.
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
                          {(currentFile.size / (1024 * 1024)).toFixed(2)} MB • Ready in RAM
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                      In-Memory
                    </span>
                  </div>
                ) : (
                  <div className="p-3 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-500">
                    Scan the QR code to pair your phone and transfer files directly.
                  </div>
                )}

                {/* ISO/IEC 18004 Standard QR Code Display */}
                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                  <div className="w-60 h-60 p-3 rounded-2xl bg-white border border-zinc-200 shadow-md flex items-center justify-center relative">
                    {isGeneratingQr ? (
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                        <span className="text-xs font-mono">Generating QR...</span>
                      </div>
                    ) : qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan QR Code with Phone"
                        className="w-full h-full object-contain [image-rendering:pixelated]"
                      />
                    ) : (
                      <div className="text-xs text-rose-500 font-mono">Failed to render QR</div>
                    )}
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-amber-500" />
                      <span>Point your phone camera to scan</span>
                    </p>
                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      Pairing PIN: <strong className="text-amber-500 font-bold tracking-wider">{pinCode}</strong>
                    </p>
                  </div>
                </div>

                {/* Local Network Info & Customization */}
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 flex items-center gap-1 font-semibold">
                      <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Target Network URL:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingOrigin(!isEditingOrigin)}
                      className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditingOrigin ? "Cancel" : "Change IP / Host"}</span>
                    </button>
                  </div>

                  {isEditingOrigin ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customOriginInput}
                        onChange={(e) => setCustomOriginInput(e.target.value)}
                        placeholder="e.g. http://192.168.1.50:3000"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomOrigin}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate">
                      {getFullPairingUrl()}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400 italic">
                    Tip: Make sure your phone and laptop are connected to the same Wi-Fi router.
                  </p>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>ISO/IEC 18004 Standard QR</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
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
                    Scan the QR code with your phone to upload photos, scanned documents, or PDFs straight into your laptop studio memory.
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                  <div className="w-56 h-56 p-3 rounded-2xl bg-white border border-zinc-200 shadow-md flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan QR to Upload"
                        className="w-full h-full object-contain [image-rendering:pixelated]"
                      />
                    ) : (
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                    )}
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Scan to open Phone Uploader
                    </p>
                    <p className="text-[11px] font-mono text-zinc-400">
                      Room: <span className="text-zinc-600 dark:text-zinc-300">{roomId}</span>
                    </p>
                  </div>
                </div>

                {/* Direct Upload Simulator / Fallback */}
                <div className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 text-center space-y-2">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Testing on same machine or want to select a file directly?
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pick File or Camera Photo</span>
                    <input
                      type="file"
                      accept=".pdf,image/*,.docx"
                      onChange={handleManualUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {receivedFile && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Received {receivedFile.name} ({(receivedFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      Open in Studio
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
