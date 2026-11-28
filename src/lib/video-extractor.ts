import { spawn, execFile, spawnSync, ChildProcess } from "child_process";
import { Readable, PassThrough } from "stream";
import path from "path";
import fs from "fs";

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
  return (
    name
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "video"
  );
}

let _cachedPythonAvailable: boolean | null = null;
export function isPythonAvailable(): boolean {
  if (_cachedPythonAvailable !== null) return _cachedPythonAvailable;
  try {
    const res = spawnSync("python", ["--version"], { timeout: 2000 });
    _cachedPythonAvailable = res.status === 0;
  } catch {
    _cachedPythonAvailable = false;
  }
  return _cachedPythonAvailable;
}

let _cachedFfmpegPath: string | null = null;
export function getFfmpegPath(): string | null {
  if (_cachedFfmpegPath !== null) return _cachedFfmpegPath || null;
  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "ffmpeg.exe" : "ffmpeg";

  const candidates = [
    path.resolve(process.cwd(), `bin/${binaryName}`),
    path.resolve(process.cwd(), `web-app/bin/${binaryName}`),
    path.resolve(process.cwd(), `node_modules/ffmpeg-static/${binaryName}`),
    path.resolve(process.cwd(), `web-app/node_modules/ffmpeg-static/${binaryName}`),
  ];

  if (isWindows) {
    candidates.push(
      "C:\\Users\\yaswa\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python311\\site-packages\\static_ffmpeg\\bin\\win32\\ffmpeg.EXE"
    );
  }

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const res = spawnSync(c, ["-version"], { timeout: 2000 });
        if (res.status === 0) {
          _cachedFfmpegPath = c;
          return c;
        }
      }
    } catch {}
  }

  try {
    const sysCmd = isWindows ? "where" : "which";
    const res = spawnSync(sysCmd, ["ffmpeg"], { timeout: 2000, encoding: "utf8" });
    if (res.status === 0 && res.stdout) {
      const firstLine = res.stdout.trim().split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        _cachedFfmpegPath = firstLine;
        return firstLine;
      }
    }
  } catch {}

  _cachedFfmpegPath = "";
  return null;
}

/**
 * Inspect video information and detect supported resolutions including 4K (2160p).
 */
export async function extractVideoInfo(cleanUrl: string): Promise<VideoInfoResult> {
  const platform = detectPlatform(cleanUrl);

  // 1. Try yt-dlp first if python is available
  if (isPythonAvailable()) {
    try {
      const ytdlData = await new Promise<any>((resolve, reject) => {
        execFile(
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

        // Audio options
        resolutions.push({
          id: "mp3-320",
          label: "MP3 Audio (320 kbps)",
          resolution: "High Fidelity Stereo",
          quality: "320k",
          format: "mp3",
          type: "audio",
          bitrate: "320 kbps",
        });

        resolutions.push({
          id: "mp3-128",
          label: "MP3 Audio (128 kbps)",
          resolution: "Standard Stereo",
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
      resolution: "High Fidelity Stereo",
      quality: "320k",
      format: "mp3",
      type: "audio",
      bitrate: "320 kbps",
    },
    {
      id: "mp3-128",
      label: "MP3 Audio (128 kbps)",
      resolution: "Standard Stereo",
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
 * Converts to authentic, fully playable MP3 audio via ffmpeg libmp3lame,
 * and formats video as true fragmented MP4 for 100% player compatibility.
 */
export async function createDownloadStream(
  videoUrl: string,
  quality: string,
  format: string,
  signal?: AbortSignal
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; fileExt: string }> {
  const isAudio =
    format === "mp3" || format === "m4a" || quality.includes("audio") || quality.includes("k");
  const fileExt = isAudio ? "mp3" : "mp4";
  const contentType = isAudio ? "audio/mpeg" : "video/mp4";
  const ffmpegBinary = getFfmpegPath();
  const pythonOk = isPythonAvailable();

  // 1. Audio Transcoding to true MP3 via ffmpeg
  if (isAudio && ffmpegBinary && pythonOk) {
    try {
      const bitrate = quality.includes("128") ? "128k" : "320k";

      const ytdlProc = spawn(
        "python",
        [
          "-m", "yt_dlp",
          "--js-runtimes", "node",
          "--ffmpeg-location", ffmpegBinary,
          "--no-warnings",
          "-f", "bestaudio[ext=m4a]/bestaudio/best",
          "-o", "-",
          videoUrl.trim(),
        ],
        { stdio: ["ignore", "pipe", "pipe"] }
      );

      const ffmpegProc = spawn(
        ffmpegBinary,
        [
          "-i", "pipe:0",
          "-map", "0:a:0?",
          "-vn",
          "-map_metadata", "-1",
          "-acodec", "libmp3lame",
          "-b:a", bitrate,
          "-ar", "44100",
          "-ac", "2",
          "-write_xing", "1",
          "-id3v2_version", "3",
          "-f", "mp3",
          "pipe:1",
        ],
        { stdio: ["pipe", "pipe", "pipe"] }
      );

      // Prevent pipe deadlocks by actively draining stderr
      ytdlProc.stderr.on("data", (chunk) => {
        const msg = chunk.toString();
        if (msg.includes("ERROR:")) console.warn("[yt-dlp audio error]:", msg.trim());
      });
      ytdlProc.stderr.resume();

      ffmpegProc.stderr.on("data", (chunk) => {
        const msg = chunk.toString();
        if (msg.includes("Error") || msg.includes("error")) console.warn("[ffmpeg audio error]:", msg.trim());
      });
      ffmpegProc.stderr.resume();

      ytdlProc.stdout.pipe(ffmpegProc.stdin);
      ytdlProc.stdout.on("error", () => {});
      ffmpegProc.stdin.on("error", () => {});

      const cleanup = () => {
        try { ytdlProc.kill("SIGKILL"); } catch {}
        try { ffmpegProc.kill("SIGKILL"); } catch {}
      };

      if (signal) signal.addEventListener("abort", cleanup);
      ytdlProc.on("error", (err) => { console.warn("ytdl error:", err); cleanup(); });
      ffmpegProc.on("error", (err) => { console.warn("ffmpeg error:", err); cleanup(); });

      const webStream = Readable.toWeb(ffmpegProc.stdout) as ReadableStream<Uint8Array>;
      return { stream: webStream, contentType, fileExt };
    } catch (audioTranscodeErr) {
      console.warn("Audio transcode pipe error, falling back:", audioTranscodeErr);
    }
  }

  // 2. Video Streaming: Pipe through ffmpeg to guarantee genuine fragmented MP4 container
  if (!isAudio && ffmpegBinary && pythonOk) {
    try {
      let formatSpec =
        "bestvideo[vcodec^=avc1][height<=1080]+bestaudio[ext=m4a]/bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best";
      if (quality === "2160p" || quality === "4k") {
        formatSpec =
          "bestvideo[vcodec^=avc1][height<=2160]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best";
      } else if (quality === "1440p" || quality === "2k") {
        formatSpec =
          "bestvideo[vcodec^=avc1][height<=1440]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best";
      } else if (quality === "1080p") {
        formatSpec =
          "bestvideo[vcodec^=avc1][height<=1080]+bestaudio[ext=m4a]/bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best";
      } else if (quality === "720p") {
        formatSpec =
          "bestvideo[vcodec^=avc1][height<=720]+bestaudio[ext=m4a]/bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best";
      } else if (quality === "480p") {
        formatSpec =
          "bestvideo[vcodec^=avc1][height<=480]+bestaudio[ext=m4a]/bestvideo[ext=mp4][height<=480]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best";
      } else if (quality === "360p") {
        formatSpec =
          "bestvideo[vcodec^=avc1][height<=360]+bestaudio[ext=m4a]/bestvideo[ext=mp4][height<=360]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best";
      }

      const ytdlProc = spawn(
        "python",
        [
          "-m", "yt_dlp",
          "--js-runtimes", "node",
          "--ffmpeg-location", ffmpegBinary,
          "--no-warnings",
          "-f", formatSpec,
          "-o", "-",
          videoUrl.trim(),
        ],
        { stdio: ["ignore", "pipe", "pipe"] }
      );

      // Re-mux into compliant fragmented MP4 container with standard AAC audio
      const ffmpegProc = spawn(
        ffmpegBinary,
        [
          "-i", "pipe:0",
          "-map", "0:v:0?",
          "-map", "0:a:0?",
          "-map_metadata", "-1",
          "-c:v", "copy",
          "-c:a", "aac",
          "-movflags", "frag_keyframe+empty_moov+default_base_moof",
          "-f", "mp4",
          "pipe:1",
        ],
        { stdio: ["pipe", "pipe", "pipe"] }
      );

      // Prevent pipe deadlocks by actively draining stderr
      ytdlProc.stderr.on("data", (chunk) => {
        const msg = chunk.toString();
        if (msg.includes("ERROR:")) console.warn("[yt-dlp video error]:", msg.trim());
      });
      ytdlProc.stderr.resume();

      ffmpegProc.stderr.on("data", (chunk) => {
        const msg = chunk.toString();
        if (msg.includes("Error") || msg.includes("error")) console.warn("[ffmpeg video error]:", msg.trim());
      });
      ffmpegProc.stderr.resume();

      ytdlProc.stdout.pipe(ffmpegProc.stdin);
      ytdlProc.stdout.on("error", () => {});
      ffmpegProc.stdin.on("error", () => {});

      const cleanup = () => {
        try { ytdlProc.kill("SIGKILL"); } catch {}
        try { ffmpegProc.kill("SIGKILL"); } catch {}
      };

      if (signal) signal.addEventListener("abort", cleanup);
      ytdlProc.on("error", (err) => { console.warn("ytdl video error:", err); cleanup(); });
      ffmpegProc.on("error", (err) => { console.warn("ffmpeg remux error:", err); cleanup(); });

      const webStream = Readable.toWeb(ffmpegProc.stdout) as ReadableStream<Uint8Array>;
      return { stream: webStream, contentType, fileExt };
    } catch (videoRemuxErr) {
      console.warn("Video remux error, falling back:", videoRemuxErr);
    }
  }

  // 3. Fallback: Pure JS alldl stream
  const { alldl } = await import("rahad-all-downloader-v2");
  try {
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
        return {
          stream: upstream.body as ReadableStream<Uint8Array>,
          contentType: isAudio ? "audio/mpeg" : "video/mp4",
          fileExt: isAudio ? "mp3" : "mp4",
        };
      }
    }
  } catch (alldlStreamErr) {
    console.warn("alldl fallback failed:", alldlStreamErr);
  }

  throw new Error("Could not initialize video or audio download stream.");
}
