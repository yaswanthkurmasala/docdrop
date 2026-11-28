import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

process.env.YTDL_NO_UPDATE = "1";

function sanitizeForDownload(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "").trim() || "video";
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const videoUrl = searchParams.get("url");
    const quality = searchParams.get("quality") || "720p";
    const format = searchParams.get("format") || "mp4";
    const rawFileName = searchParams.get("fileName") || "video";

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing 'url' query parameter" }, { status: 400 });
    }

    const isAudio = format === "mp3" || format === "m4a" || quality.includes("audio") || quality.includes("k");
    const fileExt = isAudio ? (format === "m4a" ? "m4a" : "mp3") : "mp4";
    const cleanBase = sanitizeForDownload(rawFileName.replace(/\.[^/.]+$/, ""));
    const finalFileName = `${cleanBase}.${fileExt}`;
    const contentType = isAudio ? (fileExt === "m4a" ? "audio/mp4" : "audio/mpeg") : "video/mp4";

    const { alldl } = await import("rahad-all-downloader-v2");

    // Option A: Try native alldl.stream
    try {
      const streamOpts: any = {
        quality: quality as any,
        audioOnly: isAudio,
      };

      if (isAudio) {
        streamOpts.audioFormat = fileExt as any;
        if (quality.includes("320")) {
          streamOpts.audioBitrate = 320;
        } else if (quality.includes("128")) {
          streamOpts.audioBitrate = 128;
        }
      }

      const nodeStream = await alldl.stream(videoUrl, streamOpts);
      if (nodeStream && typeof (nodeStream as any).pipe === "function") {
        const webStream = Readable.toWeb(nodeStream);
        return new Response(webStream as any, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`,
            "Cache-Control": "no-cache",
          },
        });
      }
    } catch (streamErr) {
      console.warn("alldl.stream attempt failed, trying direct URL fetch fallback:", streamErr);
    }

    // Option B: Fetch info and stream via direct URL
    const info = await alldl(videoUrl, {
      quality: quality as any,
      audioOnly: isAudio,
    });

    const directDownloadUrl =
      (isAudio && info?.data?.download && (info.data.download as any)?.audio) ||
      info?.data?.videoUrl ||
      ((info?.data?.download as any)?.video) ||
      ((info?.data?.download as any)?.videos?.[0]?.url);

    if (directDownloadUrl && typeof directDownloadUrl === "string") {
      const upstream = await fetch(directDownloadUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (upstream.ok && upstream.body) {
        return new Response(upstream.body, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`,
            "Cache-Control": "no-cache",
          },
        });
      }
    }

    return NextResponse.json(
      { error: "Could not stream video. Please check the video URL and permissions." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Download stream error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download video stream" },
      { status: 500 }
    );
  }
}
