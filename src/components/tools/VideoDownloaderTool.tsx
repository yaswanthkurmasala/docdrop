"use client";

import React, { useState, useRef } from "react";
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
  ExternalLink,
  Flame,
  Layers,
  Clock,
  HardDriveDownload,
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
  const [downloadProgress, setDownloadProgress] = useState("");
  const [downloadPercentage, setDownloadPercentage] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeDownloadUrl, setActiveDownloadUrl] = useState<string | null>(null);
  const [activeDownloadName, setActiveDownloadName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [hasPasted, setHasPasted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    setActiveDownloadUrl(null);
    setDownloadProgress("");
    setDownloadPercentage(0);

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

      // Pre-select 4K if supported, else 1080p, else first resolution
      const fourKRes = data.resolutions.find((r: VideoResolutionOption) => r.is4K || r.id === "2160p");
      const tenEightyRes = data.resolutions.find((r: VideoResolutionOption) => r.id === "1080p");
      const defaultRes = fourKRes || tenEightyRes || data.resolutions[0];

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

  // Trigger download stream with live progress and verified blob creation
  const handleDownload = async () => {
    if (!videoData || !selectedResolution) return;

    setIsDownloading(true);
    setError(null);
    setDownloadSuccess(false);
    setDownloadPercentage(0);
    setDownloadProgress("Initiating high-speed stream...");

    const ext = selectedResolution.format;
    const effectiveBase = computeEffectiveFileName(videoData.defaultFileName, customFileName).replace(/\.[^/.]+$/, "");
    const finalFileName = `${effectiveBase}.${ext}`;

    const downloadEndpoint = `/api/video-downloader/download?url=${encodeURIComponent(
      videoData.url
    )}&quality=${encodeURIComponent(selectedResolution.quality)}&format=${encodeURIComponent(
      selectedResolution.format
    )}&fileName=${encodeURIComponent(finalFileName)}`;

    setActiveDownloadUrl(downloadEndpoint);
    setActiveDownloadName(finalFileName);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(downloadEndpoint, { signal: controller.signal });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed with HTTP ${res.status}.`);
      }

      const contentLength = res.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = res.body?.getReader();

      if (!reader) {
        throw new Error("Unable to establish readable media stream.");
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          if (totalBytes > 0) {
            const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
            setDownloadPercentage(pct);
            setDownloadProgress(
              `Downloading: ${pct}% (${(receivedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`
            );
          } else {
            setDownloadProgress(
              `Streaming: ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB received...`
            );
          }
        }
      }

      setDownloadProgress("Assembling file and saving to disk...");
      setDownloadPercentage(100);

      const mimeType =
        res.headers.get("content-type") ||
        (selectedResolution.format === "mp3" ? "audio/mpeg" : "video/mp4");

      const blob = new Blob(chunks as BlobPart[], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 2000);

      setIsDownloading(false);
      setDownloadSuccess(true);
      setDownloadProgress(`Saved ${finalFileName} successfully!`);

      try {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Download was cancelled.");
      } else {
        setError(err?.message || "Failed to download media stream. You can try the direct download link below.");
      }
      setIsDownloading(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsDownloading(false);
    setDownloadProgress("");
    setDownloadPercentage(0);
  };

  const resetAll = () => {
    handleCancelDownload();
    setUrlInput("");
    setVideoData(null);
    setSelectedResolution(null);
    setCustomFileName("");
    setError(null);
    setDownloadSuccess(false);
    setActiveDownloadUrl(null);
    setDownloadProgress("");
    setDownloadPercentage(0);
  };

  const has4KOption = videoData?.resolutions.some((r) => r.is4K || r.id === "2160p");

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/70 border border-violet-300 dark:border-violet-800 text-violet-800 dark:text-violet-300 text-xs font-bold shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-violet-500 fill-violet-500" />
          <span>Universal Video & Audio Downloader</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-md bg-amber-500 text-zinc-950 font-black text-[10px] tracking-wide">
            4K SUPPORT
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
          Download Videos in All Resolutions (up to 4K) & MP3
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Paste any link from YouTube, Instagram Reels, X (Twitter), Facebook, TikTok, Reddit, Vimeo & download directly in Ultra HD 4K, 2K, 1080p, 720p, 480p, or high-fidelity MP3.
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
                  <span>Inspecting formats...</span>
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
            className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>YouTube 4K Remaster</span>
            <span className="px-1 py-0.1 text-[9px] rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
              4K
            </span>
          </button>
        </div>

        {/* Error message card */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex flex-col gap-2"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <span className="font-bold">Download Notice:</span>
                <p>{error}</p>
              </div>
            </div>
            {activeDownloadUrl && (
              <div className="pt-1 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
                <span className="text-[11px] text-rose-700 dark:text-rose-300">
                  Alternative: Try direct browser stream
                </span>
                <a
                  href={activeDownloadUrl}
                  download={activeDownloadName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-rose-800 dark:text-rose-200 underline hover:text-rose-950 text-xs cursor-pointer"
                >
                  <span>Direct Download Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
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
                <div className="relative w-full sm:w-48 h-30 rounded-2xl overflow-hidden bg-black shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm group">
                  <img
                    src={videoData.thumbnail}
                    alt={videoData.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                    {videoData.platformName}
                  </div>
                  {has4KOption && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-linear-to-r from-amber-500 to-orange-500 text-[10px] font-black text-zinc-950 uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Flame className="w-3 h-3 text-zinc-950 fill-zinc-950" />
                      <span>4K ULTRA HD</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full sm:w-48 h-30 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                  <Film className="w-8 h-8 text-zinc-400" />
                </div>
              )}

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    {videoData.platformName}
                  </span>
                  {has4KOption && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>4K Ultra HD Available</span>
                    </span>
                  )}
                  {videoData.duration && (
                    <span className="text-[11px] text-zinc-500 font-mono font-medium">
                      Duration: {videoData.duration}
                    </span>
                  )}
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
                  Select Resolution & Quality:
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
                    const is4K = res.is4K || res.id === "2160p";
                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => setSelectedResolution(res)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? is4K
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40 shadow-md shadow-amber-500/10"
                              : "bg-violet-50 dark:bg-violet-950/40 border-violet-500 ring-2 ring-violet-500/30 shadow-sm"
                            : is4K
                            ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 hover:border-amber-400"
                            : "bg-white dark:bg-zinc-950/50 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        {is4K ? (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider shadow-xs">
                            4K ULTRA HD
                          </div>
                        ) : res.recommended ? (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-violet-600 text-white font-bold text-[9px] uppercase tracking-wider">
                            Best Quality
                          </div>
                        ) : res.badge ? (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[9px] uppercase tracking-wider">
                            {res.badge}
                          </div>
                        ) : null}

                        <div className="space-y-1">
                          <span
                            className={`text-xs font-extrabold block font-mono ${
                              is4K
                                ? "text-amber-900 dark:text-amber-300"
                                : "text-zinc-950 dark:text-white"
                            }`}
                          >
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

            {/* Live Progress Bar Card during download */}
            {isDownloading && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-violet-200 dark:border-violet-900/60 shadow-inner space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-zinc-900 dark:text-white font-mono">
                    <RefreshCw className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                    <span>{downloadProgress || "Downloading stream..."}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelDownload}
                    className="text-zinc-500 hover:text-rose-500 text-[11px] underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-linear-to-r from-violet-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${downloadPercentage > 0 ? downloadPercentage : 15}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* Direct Link Banner if download was completed */}
            {downloadSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Successfully downloaded <strong>{activeDownloadName}</strong>! Check your device Downloads folder.
                  </span>
                </div>
                {activeDownloadUrl && (
                  <a
                    href={activeDownloadUrl}
                    download={activeDownloadName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 underline hover:text-emerald-800 cursor-pointer text-right shrink-0"
                  >
                    <span>Download again</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </motion.div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
              <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Zero Cloud Leak • Direct stream • Ad-free</span>
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
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 min-w-[220px] ${
                    selectedResolution?.is4K || selectedResolution?.id === "2160p"
                      ? "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-amber-500/25"
                      : "bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950"
                  }`}
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{downloadPercentage > 0 ? `${downloadPercentage}%` : "Streaming..."}</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Download Ready!</span>
                    </>
                  ) : (
                    <>
                      <HardDriveDownload className="w-4 h-4" />
                      <span>
                        Download {selectedResolution?.quality} ({selectedResolution?.format.toUpperCase()})
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
