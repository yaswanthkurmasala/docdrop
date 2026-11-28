"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Send,
  Layers,
  Scissors,
  Lock,
  Stamp,
  FileCode2,
  FileSpreadsheet,
  ScanText,
  Sparkles,
} from "lucide-react";
import { generateQrDataUrl } from "@/lib/qr-code";
import { setChainedDocument } from "@/lib/pdf-tools/chained-document";

interface PhoneTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFile?: File | null;
  onReceiveFile?: (file: File) => void;
}

export const POPULAR_P2P_TOOLS = [
  {
    id: "organize-pages",
    name: "Visual Page Organizer",
    desc: "Reorder, rotate, split, or delete pages",
    icon: Layers,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "compress-pdf",
    name: "Compress PDF",
    desc: "Reduce file size up to 90% without quality loss",
    icon: Zap,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "pdf-to-word",
    name: "PDF to Word (.docx)",
    desc: "Convert to fully editable Microsoft Word document",
    icon: FileText,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "pdf-to-excel",
    name: "PDF to Excel (.xlsx)",
    desc: "Extract tables and tabular data directly to spreadsheets",
    icon: FileSpreadsheet,
    color: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  {
    id: "ocr-pdf",
    name: "OCR & Text Layer",
    desc: "Make scanned document searchable and copyable",
    icon: ScanText,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "sign-pdf",
    name: "Sign & Audit Stamp",
    desc: "Add legally binding digital signatures and certs",
    icon: Stamp,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "protect-pdf",
    name: "Protect & Encrypt",
    desc: "Lock with 256-bit AES encryption & password",
    icon: Lock,
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  },
  {
    id: "merge-pdf",
    name: "Merge PDF",
    desc: "Combine with other files into one clean document",
    icon: Scissors,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
];

export function PhoneTransferModal({
  isOpen,
  onClose,
  currentFile = null,
  onReceiveFile,
}: PhoneTransferModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"send" | "receive">("receive");
  const [roomId, setRoomId] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);
  const [effectiveOrigin, setEffectiveOrigin] = useState<string>("");
  const [isEditingOrigin, setIsEditingOrigin] = useState<boolean>(false);
  const [customOriginInput, setCustomOriginInput] = useState<string>("");
  const [phoneOnline, setPhoneOnline] = useState<boolean>(false);
  const [phoneDeviceName, setPhoneDeviceName] = useState<string>("");
  const [receivedFile, setReceivedFile] = useState<File | null>(null);

  // Send to Phone States
  const [fileToSend, setFileToSend] = useState<File | null>(currentFile);
  const [isSendingToPhone, setIsSendingToPhone] = useState<boolean>(false);
  const [sendToPhoneSuccess, setSendToPhoneSuccess] = useState<boolean>(false);

  const localFilePickerRef = useRef<HTMLInputElement>(null);
  const processedFileIdsRef = useRef<Set<string>>(new Set());

  // Update fileToSend when currentFile prop changes
  useEffect(() => {
    if (currentFile) {
      setFileToSend(currentFile);
      setActiveTab("send");
    }
  }, [currentFile]);

  // Initialize room, PIN, and detect LAN Wi-Fi IP. Persist in sessionStorage so phone & laptop stay paired!
  const initTransferSession = useCallback(async (forceNew = false) => {
    setIsGeneratingQr(true);

    let room = "";
    let pin = "";

    if (!forceNew && typeof window !== "undefined") {
      room = sessionStorage.getItem("docdrop_p2p_room") || "";
      pin = sessionStorage.getItem("docdrop_p2p_pin") || "";
    }

    if (!room || !pin) {
      room = "drop-" + Math.random().toString(36).substring(2, 8);
      pin = Math.floor(100000 + Math.random() * 900000).toString();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("docdrop_p2p_room", room);
        sessionStorage.setItem("docdrop_p2p_pin", pin);
      }
    }

    setRoomId(room);
    setPinCode(pin);
    processedFileIdsRef.current.clear();
    setSendToPhoneSuccess(false);

    let baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://docdrop.com";

    // If running on local computer, query local LAN Wi-Fi IPv4 so phone on Wi-Fi can reach it
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
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

    // Register room on server
    try {
      await fetch("/api/p2p/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, pin, device: "laptop" }),
      });
    } catch {}

    const targetUrl = `${baseOrigin}/p2p?room=${room}&pin=${pin}`;
    try {
      const dataUrl = await generateQrDataUrl(targetUrl, 280);
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("[P2P] QR generation error:", err);
    } finally {
      setIsGeneratingQr(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      initTransferSession();
    }
  }, [isOpen, initTransferSession]);

  // Room status & file receiver polling loop (every 1.1 seconds while modal is open)
  useEffect(() => {
    if (!isOpen || !roomId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/p2p/room?room=${encodeURIComponent(roomId)}&pin=${encodeURIComponent(pinCode)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data.phoneOnline !== undefined) {
          setPhoneOnline(!!data.phoneOnline);
          if (data.phoneDeviceName) setPhoneDeviceName(data.phoneDeviceName);
        }

        // Check for incoming files sent from phone ('phone-to-laptop')
        const incomingFiles = (data.files || []).filter(
          (f: any) => f.direction === "phone-to-laptop" && !processedFileIdsRef.current.has(f.id)
        );

        if (incomingFiles.length > 0) {
          const firstIncoming = incomingFiles[0];
          processedFileIdsRef.current.add(firstIncoming.id);

          // Download file into browser RAM
          const fileRes = await fetch(
            `/api/p2p/transfer?room=${encodeURIComponent(roomId)}&fileId=${encodeURIComponent(firstIncoming.id)}`
          );
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            const newFile = new File([blob], firstIncoming.name, {
              type: firstIncoming.type || blob.type || "application/pdf",
              lastModified: Date.now(),
            });

            setReceivedFile(newFile);
            setChainedDocument(newFile);
            if (onReceiveFile) onReceiveFile(newFile);

            // Cleanup ephemeral buffer on server
            fetch(
              `/api/p2p/transfer?room=${encodeURIComponent(roomId)}&fileId=${encodeURIComponent(firstIncoming.id)}`,
              {
                method: "DELETE",
              }
            ).catch(() => {});

            // Global event dispatch so any mounted tools auto-load it
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("docdrop:file-received", { detail: { file: newFile } })
              );
            }

            try {
              confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
            } catch {}
          }
        }
      } catch (err) {
        console.debug("[P2P Laptop Polling] Heartbeat debug:", err);
      }
    }, 1100);

    return () => clearInterval(interval);
  }, [isOpen, roomId, pinCode, onReceiveFile]);

  // Re-generate QR when user customizes origin
  const handleApplyCustomOrigin = async () => {
    if (!customOriginInput.trim()) return;
    setIsGeneratingQr(true);
    setEffectiveOrigin(customOriginInput.trim());
    setIsEditingOrigin(false);

    const targetUrl = `${customOriginInput.trim()}/p2p?room=${roomId}&pin=${pinCode}`;
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
    return `${effectiveOrigin}/p2p?room=${roomId}&pin=${pinCode}`;
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

  // Send document from laptop to phone
  const handleSendFileToPhone = async () => {
    if (!fileToSend || !roomId) return;
    setIsSendingToPhone(true);
    setSendToPhoneSuccess(false);

    try {
      const formData = new FormData();
      formData.append("room", roomId);
      formData.append("direction", "laptop-to-phone");
      formData.append("file", fileToSend);

      const res = await fetch("/api/p2p/transfer", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to send file to phone");
      }

      setSendToPhoneSuccess(true);
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      alert("Send failed: " + (err.message || "Please check connection"));
    } finally {
      setIsSendingToPhone(false);
    }
  };

  // Pick local file on laptop to send to phone
  const handlePickLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToSend(e.target.files[0]);
      setSendToPhoneSuccess(false);
    }
  };

  // Launch tool on laptop with the received file pre-loaded
  const handleLaunchTool = (toolSlug: string) => {
    const f = receivedFile || fileToSend;
    if (f) {
      setChainedDocument(f);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("docdrop:file-received", { detail: { file: f } }));
      }
    }
    onClose();
    router.push(`/tools/${toolSlug}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--surface)]/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <span>Drop to Phone (P2P Transfer)</span>
                    {phoneOnline && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{phoneDeviceName || "Phone Connected"}</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Two-way Wi-Fi transfer: send files between phone and laptop tools instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => initTransferSession(true)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs"
                  title="Generate new QR code and room"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("receive")}
                className={`flex-1 py-2.5 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "receive"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>1. Receive from Phone</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("send")}
                className={`flex-1 py-2.5 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "send"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>2. Send Back to Phone</span>
              </button>
            </div>

            {/* TAB 1: RECEIVE FROM PHONE */}
            {activeTab === "receive" && (
              <div className="space-y-4">
                {/* Received File Alert with Direct Tool Launcher */}
                {receivedFile ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-4"
                  >
                    <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold truncate text-zinc-950 dark:text-white text-sm">
                            {receivedFile.name}
                          </p>
                          <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                            {(receivedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready in RAM
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 font-bold text-emerald-700 dark:text-emerald-300">
                        SUCCESSFULLY RECEIVED
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Choose a tool to perform on this file on your laptop:</span>
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {POPULAR_P2P_TOOLS.map((tool) => {
                          const Icon = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => handleLaunchTool(tool.id)}
                              className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 hover:border-amber-500/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 text-left transition-all cursor-pointer flex items-center gap-2.5 group"
                            >
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${tool.color}`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-amber-500">
                                  {tool.name}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate">{tool.desc}</p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-500 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* Instructions banner */}
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                      <p className="font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Scan with any smartphone camera</span>
                      </p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Open your phone camera, scan the QR code below, and select any document or photo to transfer straight into this laptop.
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 space-y-3">
                      <div className="w-52 h-52 p-2.5 rounded-2xl bg-white border border-zinc-200 shadow-md flex items-center justify-center relative">
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
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              phoneOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-400 animate-ping"
                            }`}
                          />
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {phoneOnline ? `${phoneDeviceName || "Phone"} connected!` : "Waiting for phone scan..."}
                          </p>
                        </div>
                        <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          Room: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{roomId}</span> • PIN:{" "}
                          <span className="text-amber-500 font-bold">{pinCode}</span>
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Local Network Info & Customization */}
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 flex items-center gap-1 font-semibold">
                      <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Direct Pairing URL:</span>
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
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>ISO/IEC Standard QR</span>
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

            {/* TAB 2: SEND BACK TO PHONE */}
            {activeTab === "send" && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={localFilePickerRef}
                  onChange={handlePickLocalFile}
                  accept=".pdf,image/*,.docx,.xlsx"
                  className="hidden"
                />

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-amber-500" />
                    <span>Send Processed File to Phone</span>
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Your phone is paired in Room <strong>{roomId}</strong>. When you send, the file will pop up on your phone screen immediately.
                  </p>
                </div>

                {fileToSend ? (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-6 h-6 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">{fileToSend.name}</p>
                          <p className="text-[11px] font-mono text-zinc-400">
                            {(fileToSend.size / (1024 * 1024)).toFixed(2)} MB • Ready to Beam
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => localFilePickerRef.current?.click()}
                        className="text-xs font-semibold text-zinc-500 hover:text-amber-500 underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isSendingToPhone}
                      onClick={handleSendFileToPhone}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSendingToPhone ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Streaming to Phone...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Beam to Phone Now</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 text-center space-y-3">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      No document loaded yet. Pick a file from your laptop to beam to your phone:
                    </p>
                    <button
                      type="button"
                      onClick={() => localFilePickerRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold inline-flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select File on Laptop</span>
                    </button>
                  </div>
                )}

                {sendToPhoneSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        <strong>Sent to phone!</strong> The file is now ready on your phone screen.
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Show QR code if phone needs to re-connect */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-4">
                  <div className="w-16 h-16 p-1.5 rounded-xl bg-white border border-zinc-200 shrink-0">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="Scan QR"
                        className="w-full h-full object-contain [image-rendering:pixelated]"
                      />
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                      <span>Keep phone on DocDrop screen</span>
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      If your phone disconnected, point its camera at this QR code to re-open the room.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
