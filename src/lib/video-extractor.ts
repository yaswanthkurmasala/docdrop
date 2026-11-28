import { spawn, execFile } from "child_process";
import { Readable } from "stream";

export interface VideoResolutionOption {
  id: string;
  label: string;
  resolution: string;
  quality: string;
  format: "mp4" | "mp3" | "m4a";
  type: "video" | "audio";
  bitrate?: string;
  recommended?: boolean;
  is4K?: boolean;
  badge?: string;
  directUrl?: string;
}

export interface VideoInfoResult {
  success: boolean;
  url: string;
  platform: string;
  platformName: string;
  title: string;
  author: string;
  thumbnail: string;
  duration?: string;
  resolutions: VideoResolutionOption[];
  defaultFileName: string;
}

export function detectPlatform(url: string): { key: string; name: string } {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return { key: "youtube", name: "YouTube" };
  }
  if (lower.includes("instagram.com")) {
    return { key: "instagram", name: "Instagram" };
  }
  if (lower.includes("twitter.com") || lower.includes("x.com")) {
    return { key: "twitter", name: "X (Twitter)" };
  }
  if (lower.includes("facebook.com") || lower.includes("fb.watch")) {
    return { key: "facebook", name: "Facebook" };
  }
  if (lower.includes("tiktok.com")) {
    return { key: "tiktok", name: "TikTok" };
  }
  if (lower.includes("reddit.com")) {
    return { key: "reddit", name: "Reddit" };
  }
  if (lower.includes("vimeo.com")) {
    return { key: "vimeo", name: "Vimeo" };
  }
  if (lower.includes("pinterest.com")) {
    return { key: "pinterest", name: "Pinterest" };
  }
  if (lower.includes("threads.net")) {
    return { key: "threads", name: "Threads" };
  }
  return { key: "web", name: "Web Video" };
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, " ")
    .trim() || "video";
}

/**
 * Inspect video information and detect supported resolutions including 4K (2160p).
 */
export async function extractVideoInfo(cleanUrl: string): Promise<VideoInfoResult> {
  const platform = detectPlatform(cleanUrl);

  // 1. Try yt-dlp first
  try {
    const ytdlData = await new Promise<any>((resolve, reject) => {
      const child = execFile(
        "python",
        ["-m", "yt_dlp", "--js-runtimes", "node", "--no-warnings", "-j", "--no-playlist", cleanUrl],
        { maxBuffer: 15 * 1024 * 1024, timeout: 20000 },
        (error, stdout) => {
          if (error) return reject(error);
          try {
            resolve(JSON.parse(stdout));
          } catch (parseErr) {
            reject(parseErr);
          }
        }
      );
    });

    if (ytdlData && (ytdlData.title || ytdlData.formats)) {
      const title = ytdlData.title || `${platform.name} Video`;
      const author = ytdlData.uploader || ytdlData.channel || platform.name;
      const thumbnail = ytdlData.thumbnail || "";
      const durationSeconds = ytdlData.duration;
      const duration = durationSeconds
        ? `${Math.floor(durationSeconds / 60)}:${String(Math.floor(durationSeconds % 60)).padStart(2, "0")}`
        : undefined;

      const formats: any[] = ytdlData.formats || [];
      const heights = new Set<number>(
        formats
          .map((f) => (typeof f.height === "number" ? f.height : parseInt(f.height, 10)))
          .filter((h) => !isNaN(h) && h > 0)
      );

      const has4K = [...heights].some((h) => h >= 2160);
      const has2K = [...heights].some((h) => h >= 1440 && h < 2160);
      const has1080p = [...heights].some((h) => h >= 1080);
      const has720p = [...heights].some((h) => h >= 720);
      const has480p = [...heights].some((h) => h >= 480);
      const has360p = [...heights].some((h) => h >= 360);

      const resolutions: VideoResolutionOption[] = [];

      // 4K Ultra HD
      if (has4K) {
        resolutions.push({
          id: "2160p",
          label: "4K Ultra HD (2160p)",
          resolution: "3840x2160",
          quality: "2160p",
          format: "mp4",
          type: "video",
          is4K: true,
          badge: "4K ULTRA HD",
          recommended: true,
        });
      }

      // 2K Quad HD
      if (has2K || has4K) {
        resolutions.push({
          id: "1440p",
          label: "2K Quad HD (1440p)",
          resolution: "2560x1440",
          quality: "1440p",
          format: "mp4",
          type: "video",
          badge: "2K QHD",
        });
      }

      // 1080p Full HD
      if (has1080p || resolutions.length === 0) {
        resolutions.push({
          id: "1080p",
          label: "1080p Full HD",
          resolution: "1920x1080",
          quality: "1080p",
          format: "mp4",
          type: "video",
          badge: "1080p FHD",
          recommended: !has4K,
        });
      }

      // 720p HD
      if (has720p || resolutions.length === 0) {
        resolutions.push({
          id: "720p",
          label: "720p HD",
          resolution: "1280x720",
          quality: "720p",
          format: "mp4",
          type: "video",
        });
      }

      // 480p Standard
      if (has480p) {
        resolutions.push({
          id: "480p",
          label: "480p Standard",
          resolution: "854x480",
          quality: "480p",
          format: "mp4",
          type: "video",
        });
      }

      // 360p Mobile
      if (has360p || resolutions.length < 2) {
        resolutions.push({
          id: "360p",
          label: "360p Mobile",
          resolution: "640x360",
          quality: "360p",
          format: "mp4",
          type: "video",
        });
      }

      // High-Fidelity Audio options
      resolutions.push({
        id: "mp3-320",
        label: "MP3 Audio (320 kbps)",
        resolution: "High Fidelity",
        quality: "320k",
        format: "mp3",
        type: "audio",
        bitrate: "320 kbps",
      });

      resolutions.push({
        id: "mp3-128",
        label: "MP3 Audio (128 kbps)",
        resolution: "Standard",
        quality: "128k",
        format: "mp3",
        type: "audio",
        bitrate: "128 kbps",
      });

      return {
        success: true,
        url: cleanUrl,
        platform: platform.key,
        platformName: platform.name,
        title,
        author,
        thumbnail,
        duration,
        resolutions,
        defaultFileName: sanitizeFileName(title),
      };
    }
  } catch (ytdlError) {
    console.warn("yt-dlp info inspect error, falling back to alldl:", ytdlError);
  }

  // 2. Fallback to rahad-all-downloader-v2
  const { alldl } = await import("rahad-all-downloader-v2");
  let infoResult: any = null;
  try {
    infoResult = await alldl(cleanUrl);
  } catch (alldlErr) {
    console.warn("alldl fallback warning:", alldlErr);
  }

  let title = infoResult?.data?.title || "";
  let author = infoResult?.data?.uploader || "";
  let thumbnail = infoResult?.data?.thumbnail || "";

  // 3. Fallback: oEmbed for YouTube
  if (!title && platform.key === "youtube") {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        title = oembedData.title || title;
        author = oembedData.author_name || author;
        thumbnail = oembedData.thumbnail_url || thumbnail;
      }
    } catch {}
  }

  if (!title) {
    title = `${platform.name} Video - ${new Date().toISOString().slice(0, 10)}`;
  }

  const directVideo = infoResult?.data?.videoUrl || infoResult?.data?.download?.video;
  const directAudio = infoResult?.data?.download?.audio;

  const defaultResolutions: VideoResolutionOption[] = [
    {
      id: "1080p",
      label: "1080p Full HD",
      resolution: "1920x1080",
      quality: "1080p",
      format: "mp4",
      type: "video",
      badge: "1080p FHD",
      recommended: true,
    },
    {
      id: "720p",
      label: "720p HD",
      resolution: "1280x720",
      quality: "720p",
      format: "mp4",
      type: "video",
    },
    {
      id: "480p",
      label: "480p Standard",
      resolution: "854x480",
      quality: "480p",
      format: "mp4",
      type: "video",
    },
    {
      id: "360p",
      label: "360p Mobile",
      resolution: "640x360",
      quality: "360p",
      format: "mp4",
      type: "video",
      directUrl: directVideo,
    },
    {
      id: "mp3-320",
      label: "MP3 Audio (320 kbps)",
      resolution: "High Fidelity",
      quality: "320k",
      format: "mp3",
      type: "audio",
      bitrate: "320 kbps",
    },
    {
      id: "mp3-128",
      label: "MP3 Audio (128 kbps)",
      resolution: "Standard",
      quality: "128k",
      format: "mp3",
      type: "audio",
      bitrate: "128 kbps",
      directUrl: directAudio,
    },
  ];

  return {
    success: true,
    url: cleanUrl,
    platform: platform.key,
    platformName: platform.name,
    title,
    author: author || platform.name,
    thumbnail,
    resolutions: defaultResolutions,
    defaultFileName: sanitizeFileName(title),
  };
}

/**
 * Spawns a high-speed stream for the given URL and quality.
 * Streams bytes directly to stdout and converts to a WHATWG ReadableStream.
 */
export async function createDownloadStream(
  videoUrl: string,
  quality: string,
  format: string,
  signal?: AbortSignal
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; fileExt: string }> {
  const isAudio =
    format === "mp3" || format === "m4a" || quality.includes("audio") || quality.includes("k");
  const fileExt = isAudio ? (format === "m4a" ? "m4a" : "mp3") : "mp4";
  const contentType = isAudio
    ? fileExt === "m4a"
      ? "audio/mp4"
      : "audio/mpeg"
    : "video/mp4";

  // Build the format selector for yt-dlp
  let formatSpec = "best[ext=mp4]/best";

  if (isAudio) {
    formatSpec = "bestaudio/140/251/best";
  } else if (quality === "2160p" || quality === "4k") {
    formatSpec = "bestvideo[height<=2160]+bestaudio/best[height<=2160]/401+251/best";
  } else if (quality === "1440p" || quality === "2k") {
    formatSpec = "bestvideo[height<=1440]+bestaudio/best[height<=1440]/400+251/best";
  } else if (quality === "1080p") {
    formatSpec = "bestvideo[height<=1080]+bestaudio/best[height<=1080]/137+251/best";
  } else if (quality === "720p") {
    formatSpec = "bestvideo[height<=720]+bestaudio/best[height<=720]/136+251/best";
  } else if (quality === "480p") {
    formatSpec = "bestvideo[height<=480]+bestaudio/best[height<=480]/135+251/best";
  } else if (quality === "360p") {
    formatSpec = "bestvideo[height<=360]+bestaudio/best[height<=360]/18/best";
  } else {
    formatSpec = "bestvideo+bestaudio/best";
  }

  // Attempt A: Spawn python yt-dlp directly
  try {
    const proc = spawn(
      "python",
      ["-m", "yt_dlp", "--js-runtimes", "node", "--no-warnings", "-f", formatSpec, "-o", "-", videoUrl],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    if (signal) {
      signal.addEventListener("abort", () => {
        try {
          proc.kill("SIGKILL");
        } catch {}
      });
    }

    proc.stderr.on("data", (chunk) => {
      const msg = chunk.toString();
      // Log errors only
      if (msg.includes("ERROR:") || msg.includes("Traceback")) {
        console.warn("yt-dlp stream log:", msg.trim());
      }
    });

    const webStream = Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>;
    return { stream: webStream, contentType, fileExt };
  } catch (spawnErr) {
    console.warn("Direct spawn error, falling back to alldl:", spawnErr);
  }

  // Attempt B: alldl fallback
  const { alldl } = await import("rahad-all-downloader-v2");
  try {
    const streamOpts: any = {
      quality: quality as any,
      audioOnly: isAudio,
    };
    if (isAudio) {
      streamOpts.audioFormat = fileExt as any;
      if (quality.includes("320")) streamOpts.audioBitrate = 320;
      else if (quality.includes("128")) streamOpts.audioBitrate = 128;
    }

    const nodeStream = await alldl.stream(videoUrl, streamOpts);
    if (nodeStream && typeof (nodeStream as any).pipe === "function") {
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
      return { stream: webStream, contentType, fileExt };
    }
  } catch (alldlStreamErr) {
    console.warn("alldl.stream fallback failed:", alldlStreamErr);
  }

  // Attempt C: direct upstream fetch
  const info = await alldl(videoUrl, { quality: quality as any, audioOnly: isAudio });
  const directUrl =
    (isAudio && info?.data?.download && (info.data.download as any)?.audio) ||
    info?.data?.videoUrl ||
    ((info?.data?.download as any)?.video) ||
    ((info?.data?.download as any)?.videos?.[0]?.url);

  if (directUrl && typeof directUrl === "string") {
    const upstream = await fetch(directUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (upstream.ok && upstream.body) {
      return { stream: upstream.body, contentType, fileExt };
    }
  }

  throw new Error("Could not initialize video download stream.");
}
