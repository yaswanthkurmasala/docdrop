"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  Video,
  Download,
  Link as LinkIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Music,
  Film,
  Clipboard,
  ShieldCheck,
  Zap,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { CustomFileNameInput, computeEffectiveFileName } from "@/components/CustomFileNameInput";
import type { VideoInfoResponse, VideoResolutionOption } from "@/app/api/video-downloader/info/route";

interface VideoDownloaderToolProps {
  isPro?: boolean;
  onOpenPricing?: () => void;
}

const SUPPORTED_PLATFORMS = [
  { name: "YouTube", color: "hover:border-red-500/50 hover:bg-red-500/10 text-red-500" },
  { name: "Instagram", color: "hover:border-pink-500/50 hover:bg-pink-500/10 text-pink-500" },
  { name: "X (Twitter)", color: "hover:border-sky-500/50 hover:bg-sky-500/10 text-sky-400" },
  { name: "Facebook", color: "hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-500" },
  { name: "TikTok", color: "hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400" },
  { name: "Reddit", color: "hover:border-orange-500/50 hover:bg-orange-500/10 text-orange-500" },
  { name: "Vimeo", color: "hover:border-teal-500/50 hover:bg-teal-500/10 text-teal-400" },
  { name: "Pinterest", color: "hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-500" },
];

export function VideoDownloaderTool({ isPro, onOpenPricing }: VideoDownloaderToolProps) {
  const [urlInput, setUrlInput] = useState("");
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [videoData, setVideoData] = useState<VideoInfoResponse | null>(null);
  const [selectedFormatType, setSelectedFormatType] = useState<"video" | "audio">("video");
  const [selectedResolution, setSelectedResolution] = useState<VideoResolutionOption | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPasted, setHasPasted] = useState(false);

  // Handle URL fetch
  const handleFetchVideo = async (targetUrl?: string) => {
    const urlToUse = (targetUrl || urlInput).trim();
    if (!urlToUse) {
      setError("Please paste a valid video link.");
      return;
    }

    setError(null);
    setIsLoadingInfo(true);
    setVideoData(null);
    setDownloadSuccess(false);

    try {
      const res = await fetch("/api/video-downloader/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToUse }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to inspect video. Please verify the URL is public.");
      }

      setVideoData(data);
      // Pre-select 1080p or first resolution
      const defaultRes = data.resolutions.find((r: VideoResolutionOption) => r.id === "1080p") || data.resolutions[0];
      setSelectedResolution(defaultRes);
      setSelectedFormatType(defaultRes?.type || "video");
      setCustomFileName(data.defaultFileName || "video");
    } catch (err: any) {
      setError(err?.message || "Failed to fetch video details. Please try another link.");
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.startsWith("http")) {
        setUrlInput(text);
        setHasPasted(true);
        setTimeout(() => setHasPasted(false), 2000);
        handleFetchVideo(text);
      } else {
        setError("Clipboard doesn't contain a valid web link starting with http:// or https://");
      }
    } catch {
      setError("Unable to read clipboard directly. Please paste into the box.");
    }
  };

  // Trigger download stream
  const handleDownload = () => {
    if (!videoData || !selectedResolution) return;

    setIsDownloading(true);
    setError(null);

    const ext = selectedResolution.format;
    const effectiveBase = computeEffectiveFileName(videoData.defaultFileName, customFileName).replace(/\.[^/.]+$/, "");
    const finalFileName = `${effectiveBase}.${ext}`;

    const downloadEndpoint = `/api/video-downloader/download?url=${encodeURIComponent(
      videoData.url
    )}&quality=${encodeURIComponent(selectedResolution.quality)}&format=${encodeURIComponent(
      selectedResolution.format
    )}&fileName=${encodeURIComponent(finalFileName)}`;

    // Trigger native browser download link
    const a = document.createElement("a");
    a.href = downloadEndpoint;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {}
    }, 1500);
  };

  const resetAll = () => {
    setUrlInput("");
    setVideoData(null);
    setSelectedResolution(null);
    setCustomFileName("");
    setError(null);
    setDownloadSuccess(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/70 border border-violet-300 dark:border-violet-800 text-violet-800 dark:text-violet-300 text-xs font-bold shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-violet-500 fill-violet-500" />
          <span>Universal Video & Audio Downloader</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
          Download Videos in All Resolutions
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Paste any link from YouTube, Instagram Reels, X (Twitter), Facebook, TikTok, Reddit, Vimeo & download directly in 1080p, 720p, 480p, or high-fidelity MP3.
        </p>

        {/* Supported Platforms Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
          {SUPPORTED_PLATFORMS.map((p) => (
            <span
              key={p.name}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/90 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              {p.name}
            </span>
          ))}
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            + 1000 More Sites
          </span>
        </div>
      </div>

      {/* Main Input Box Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-md space-y-4">
        <div className="relative flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full flex items-center rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/80 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-violet-500/40 focus-within:border-violet-500 transition-all shadow-inner">
            <LinkIcon className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFetchVideo();
              }}
              placeholder="Paste video link here (e.g. https://www.youtube.com/watch?v=... or https://instagram.com/reel/...)"
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
            />
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput("")}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              title="Paste link directly from your clipboard"
            >
              <Clipboard className="w-4 h-4 text-zinc-500" />
              <span>{hasPasted ? "Pasted!" : "Paste"}</span>
            </button>

            <button
              type="button"
              disabled={isLoadingInfo || !urlInput.trim()}
              onClick={() => handleFetchVideo()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
            >
              {isLoadingInfo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Fetch Video</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Sample Links */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Try sample:</span>
          <button
            type="button"
            onClick={() => {
              const u = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
              setUrlInput(u);
              handleFetchVideo(u);
            }}
            className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
          >
            YouTube Video
          </button>
        </div>

        {/* Error message card */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Extraction Notice:</span>
              <p>{error}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Video Result View */}
      <AnimatePresence>
        {videoData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: motionTokens.duration.standard }}
            className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xl space-y-6"
          >
            {/* Top Video Metadata Ribbon */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-5 border-b border-zinc-200/80 dark:border-zinc-800">
              {videoData.thumbnail ? (
                <div className="relative w-full sm:w-44 h-28 rounded-2xl overflow-hidden bg-black shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm group">
                  <img
                    src={videoData.thumbnail}
                    alt={videoData.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                    {videoData.platformName}
                  </div>
                </div>
              ) : (
                <div className="w-full sm:w-44 h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                  <Film className="w-8 h-8 text-zinc-400" />
                </div>
              )}

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    {videoData.platformName} Media
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium">Ready to download</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white line-clamp-2 leading-snug">
                  {videoData.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Creator / Channel: <strong className="text-zinc-800 dark:text-zinc-200">{videoData.author}</strong>
                </p>
              </div>
            </div>

            {/* Format Switcher (Video vs Audio) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Select Download Format & Quality:
                </span>
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFormatType("video");
                      const firstVideo = videoData.resolutions.find((r) => r.type === "video");
                      if (firstVideo) setSelectedResolution(firstVideo);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      selectedFormatType === "video"
                        ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5 text-violet-500" />
                    <span>Video (MP4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFormatType("audio");
                      const firstAudio = videoData.resolutions.find((r) => r.type === "audio");
                      if (firstAudio) setSelectedResolution(firstAudio);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      selectedFormatType === "audio"
                        ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                    }`}
                  >
                    <Music className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Audio Only (MP3)</span>
                  </button>
                </div>
              </div>

              {/* Resolution Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {videoData.resolutions
                  .filter((res) => res.type === selectedFormatType)
                  .map((res) => {
                    const isSelected = selectedResolution?.id === res.id;
                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => setSelectedResolution(res)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? "bg-violet-50 dark:bg-violet-950/40 border-violet-500 ring-2 ring-violet-500/30 shadow-sm"
                            : "bg-white dark:bg-zinc-950/50 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        {res.recommended && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-violet-600 text-white font-bold text-[9px] uppercase tracking-wider">
                            Best Quality
                          </div>
                        )}
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-zinc-950 dark:text-white block font-mono">
                            {res.label}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                            <span className="uppercase font-semibold text-violet-600 dark:text-violet-400">
                              .{res.format}
                            </span>
                            <span>•</span>
                            <span>{res.resolution}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Custom Output File Name Input Integration */}
            <div className="pt-2">
              <CustomFileNameInput
                defaultFileName={`${videoData.defaultFileName}.${selectedResolution?.format || "mp4"}`}
                value={customFileName}
                onChange={setCustomFileName}
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
              <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Direct stream • Ad-free • No watermark</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Download Another
                </button>

                <button
                  type="button"
                  disabled={isDownloading || !selectedResolution}
                  onClick={handleDownload}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 min-w-[200px]"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Streaming {selectedResolution?.label}...</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Download Started!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        Download {selectedResolution?.label.split(" ")[0]} ({selectedResolution?.format.toUpperCase()})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
