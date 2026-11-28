import { NextRequest, NextResponse } from "next/server";

// Prevent unnecessary GitHub update checks on every request
process.env.YTDL_NO_UPDATE = "1";

export interface VideoResolutionOption {
  id: string;
  label: string;
  resolution: string;
  quality: string;
  format: "mp4" | "mp3" | "m4a";
  type: "video" | "audio";
  bitrate?: string;
  recommended?: boolean;
  directUrl?: string;
}

export interface VideoInfoResponse {
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

function detectPlatform(url: string): { key: string; name: string } {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url || typeof url !== "string" || !url.trim().startsWith("http")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid video URL starting with http:// or https://" },
        { status: 400 }
      );
    }

    const cleanUrl = url.trim();
    const platform = detectPlatform(cleanUrl);

    // Dynamically import rahad-all-downloader-v2
    const { alldl } = await import("rahad-all-downloader-v2");

    let infoResult: any = null;
    let extractError: any = null;

    try {
      infoResult = await alldl(cleanUrl);
    } catch (err: any) {
      extractError = err;
      console.warn("Primary alldl extraction warning:", err?.message || err);
    }

    // Fallback: If YouTube and alldl had an issue, fetch via oEmbed
    let title = infoResult?.data?.title || "";
    let author = infoResult?.data?.uploader || "";
    let thumbnail = infoResult?.data?.thumbnail || "";

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
      } catch (oembedErr) {
        console.warn("oEmbed fallback error:", oembedErr);
      }
    }

    if (!title) {
      title = `${platform.name} Video - ${new Date().toISOString().slice(0, 10)}`;
    }

    // Default file name sanitized
    const defaultFileName = title
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Standard high-quality resolutions table
    const directVideo = infoResult?.data?.videoUrl || infoResult?.data?.download?.video;
    const directAudio = infoResult?.data?.download?.audio;

    const resolutions: VideoResolutionOption[] = [
      {
        id: "1080p",
        label: "1080p Full HD",
        resolution: "1920x1080",
        quality: "1080p",
        format: "mp4",
        type: "video",
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

    const response: VideoInfoResponse = {
      success: true,
      url: cleanUrl,
      platform: platform.key,
      platformName: platform.name,
      title,
      author: author || platform.name,
      thumbnail: thumbnail || "",
      resolutions,
      defaultFileName,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Video info resolver error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to inspect video link. Please verify the URL and ensure the video is publicly accessible.",
      },
      { status: 500 }
    );
  }
}
