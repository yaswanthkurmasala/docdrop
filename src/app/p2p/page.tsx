"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  Smartphone,
  Laptop,
  Upload,
  Download,
  CheckCircle2,
  FileText,
  Camera,
  RefreshCw,
  ShieldCheck,
  Zap,
  Wifi,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

function detectMobileDevice(): string {
  if (typeof navigator === "undefined") return "Smartphone";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "Apple iPhone";
  if (/iPad/i.test(ua)) return "Apple iPad";
  if (/Pixel/i.test(ua)) return "Google Pixel";
  if (/Samsung/i.test(ua)) return "Samsung Galaxy";
  if (/Android/i.test(ua)) return "Android Phone";
  return "Mobile Device";
}

function P2PMobileClient() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room") || "";
  const pin = searchParams.get("pin") || "";

  const [activeTab, setActiveTab] = useState<"send-to-laptop" | "receive-from-laptop">("send-to-laptop");
  const [isConnected, setIsConnected] = useState(false);
  const [laptopOnline, setLaptopOnline] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [availableLaptopFiles, setAvailableLaptopFiles] = useState<any[]>([]);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [downloadSuccessMap, setDownloadSuccessMap] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Announce presence to room
  useEffect(() => {
    if (!room) return;
    const deviceName = detectMobileDevice();

    const joinRoom = async () => {
      try {
        const res = await fetch("/api/p2p/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            pin,
            device: "phone",
            deviceName,
          }),
        });
        if (res.ok) {
          setIsConnected(true);
        }
      } catch (err) {
        console.warn("[P2P Mobile] Join error:", err);
      }
    };

    joinRoom();

    // Heartbeat & status polling every 1.2 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/p2p/room?room=${encodeURIComponent(room)}&pin=${encodeURIComponent(pin)}`);
        if (res.ok) {
          const data = await res.json();
          setLaptopOnline(!!data.laptopOnline);
          setIsConnected(true);

          // Files meant for the phone ('laptop-to-phone')
          const filesForPhone = (data.files || []).filter((f: any) => f.direction === "laptop-to-phone");
          setAvailableLaptopFiles(filesForPhone);

          // Auto-switch to receive tab if a file arrived and user hasn't selected an upload
          if (filesForPhone.length > 0 && !selectedFile && activeTab === "send-to-laptop") {
            setActiveTab("receive-from-laptop");
          }
        }
      } catch {}
    }, 1200);

    return () => clearInterval(interval);
  }, [room, pin, activeTab, selectedFile]);

  // Handle local file selection
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadSuccess(false);
    }
  };

  // Upload file to laptop via ephemeral relay
  const handleUploadToLaptop = async () => {
    if (!selectedFile || !room) return;
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("room", room);
      formData.append("direction", "phone-to-laptop");
      formData.append("file", selectedFile);

      setUploadProgress(45);
      const res = await fetch("/api/p2p/transfer", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to send file to laptop");
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      setSelectedFile(null);

      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      alert("Upload failed: " + (err.message || "Please check connection."));
    } finally {
      setIsUploading(false);
    }
  };

  // Download file sent by laptop
  const handleDownloadFile = async (fileItem: any) => {
    setDownloadingFileId(fileItem.id);
    try {
      const downloadUrl = `/api/p2p/transfer?room=${encodeURIComponent(room)}&fileId=${encodeURIComponent(fileItem.id)}`;
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileItem.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 2000);

      setDownloadSuccessMap((prev) => ({ ...prev, [fileItem.id]: true }));
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch {}
    } catch (err: any) {
      alert("Failed to download file: " + err.message);
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header & Connection Pill */}
      <div className="w-full max-w-md mx-auto space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">DocDrop P2P</h1>
              <p className="text-[11px] text-zinc-400 font-mono">Room: {room || "Local"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                laptopOnline ? "bg-emerald-500 animate-pulse" : isConnected ? "bg-amber-400" : "bg-zinc-600"
              }`}
            />
            <span className="font-semibold text-zinc-300">
              {laptopOnline ? "Laptop Connected" : isConnected ? "Waiting for Laptop" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("send-to-laptop")}
            className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "send-to-laptop"
                ? "bg-amber-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload to Laptop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receive-from-laptop")}
            className={`py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === "receive-from-laptop"
                ? "bg-amber-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Receive from Laptop</span>
            {availableLaptopFiles.length > 0 && (
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive Work Area */}
      <div className="w-full max-w-md mx-auto my-auto py-6 space-y-4">
        {activeTab === "send-to-laptop" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-5 text-center"
          >
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Send File to Laptop</h2>
              <p className="text-xs text-zinc-400">
                Choose a PDF, document, or camera photo to open instantly in your laptop studio.
              </p>
            </div>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFilePicked}
              accept=".pdf,image/*,.docx,.xlsx,.txt"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFilePicked}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {/* Selection Buttons */}
            {!selectedFile ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 flex flex-col items-center gap-2.5 transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-200">Files &amp; PDFs</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 flex flex-col items-center gap-2.5 transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-200">Camera / Scan</span>
                </button>
              </div>
            ) : (
              /* Selected File Card & Send Button */
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-6 h-6 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-zinc-400 hover:text-rose-400 px-2 py-1 font-semibold"
                  >
                    Change
                  </button>
                </div>

                {isUploading && (
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                      <span>Streaming to laptop...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleUploadToLaptop}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transferring...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Send to Laptop Now</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Success!</strong> File sent to laptop. Check your laptop screen.
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "receive-from-laptop" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4 text-center"
          >
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Receive from Laptop</h2>
              <p className="text-xs text-zinc-400">
                When you finish running any tool on your laptop, the processed file appears here.
              </p>
            </div>

            {availableLaptopFiles.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                <Laptop className="w-8 h-8 text-zinc-600 animate-pulse" />
                <p className="text-xs">Waiting for laptop to send a file...</p>
                <span className="text-[11px] text-zinc-600">
                  Run a tool on your laptop and click &quot;Send to Phone&quot;
                </span>
              </div>
            ) : (
              <div className="space-y-3 text-left">
                {availableLaptopFiles.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-2xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{f.name}</p>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {(f.size / (1024 * 1024)).toFixed(2)} MB • Processed
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={downloadingFileId === f.id}
                      onClick={() => handleDownloadFile(f)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                        downloadSuccessMap[f.id]
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                      }`}
                    >
                      {downloadingFileId === f.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : downloadSuccessMap[f.id] ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Security & Privacy Badge Footer */}
      <div className="w-full max-w-md mx-auto text-center space-y-1 pb-2">
        <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Local Wi-Fi P2P Relay • Zero Cloud Storage • Encrypted</span>
        </p>
        <p className="text-[10px] text-zinc-600 font-mono">DocDrop In-Memory Studio Transfer</p>
      </div>
    </div>
  );
}

export default function P2PPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs">
          Loading DocDrop P2P...
        </div>
      }
    >
      <P2PMobileClient />
    </Suspense>
  );
}
