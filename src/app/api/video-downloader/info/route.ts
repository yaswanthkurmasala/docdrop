import { NextRequest, NextResponse } from "next/server";
import {
  extractVideoInfo,
  type VideoResolutionOption,
  type VideoInfoResult as VideoInfoResponse,
} from "@/lib/video-extractor";

// Re-export types so UI components can consume them seamlessly
export type { VideoResolutionOption, VideoInfoResponse };

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
    const result = await extractVideoInfo(cleanUrl);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Video info resolver error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to inspect video link. Please verify the URL and ensure the video is publicly accessible.",
      },
      { status: 500 }
    );
  }
}
