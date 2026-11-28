import { NextRequest, NextResponse } from "next/server";
import { createDownloadStream, sanitizeFileName } from "@/lib/video-extractor";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const videoUrl = searchParams.get("url");
    const quality = searchParams.get("quality") || "1080p";
    const format = searchParams.get("format") || "mp4";
    const rawFileName = searchParams.get("fileName") || "video";

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing 'url' query parameter" }, { status: 400 });
    }

    const cleanBase = sanitizeFileName(rawFileName.replace(/\.[^/.]+$/, "")) || "downloaded_media";

    const { stream, contentType, fileExt } = await createDownloadStream(
      videoUrl,
      quality,
      format,
      req.signal
    );

    const finalFileName = `${cleanBase}.${fileExt}`;
    const safeAsciiName = finalFileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");

    return new Response(stream as any, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    if (error && typeof error === "object" && error.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Download stream error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stream video. Please check the video link." },
      { status: 500 }
    );
  }
}
