import { NextRequest, NextResponse } from "next/server";
import { addFileToRoom, getFileFromRoom, removeFileFromRoom } from "@/lib/p2p-rooms";

// 1. Upload file into room's volatile in-memory buffer
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const room = formData.get("room") as string;
    const direction = (formData.get("direction") as "phone-to-laptop" | "laptop-to-phone") || "phone-to-laptop";
    const file = formData.get("file") as File | null;

    if (!room || !file) {
      return NextResponse.json({ error: "Missing room or file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileItem = addFileToRoom(room, {
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      direction,
      buffer,
    });

    if (!fileItem) {
      return NextResponse.json({ error: "Room not found or expired" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fileId: fileItem.id,
      name: fileItem.name,
      size: fileItem.size,
      direction: fileItem.direction,
    });
  } catch (err: any) {
    console.error("[P2P Upload Error]:", err);
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}

// 2. Stream file data to receiver (phone or laptop)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const room = searchParams.get("room");
  const fileId = searchParams.get("fileId");

  if (!room || !fileId) {
    return NextResponse.json({ error: "Missing room or fileId" }, { status: 400 });
  }

  const fileItem = getFileFromRoom(room, fileId);
  if (!fileItem) {
    return NextResponse.json({ error: "File not found or already consumed" }, { status: 404 });
  }

  const safeAsciiName = fileItem.name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");

  return new Response(fileItem.data as any, {
    headers: {
      "Content-Type": fileItem.type,
      "Content-Length": fileItem.data.length.toString(),
      "Content-Disposition": `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(fileItem.name)}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// 3. Delete file once received to immediately free RAM
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const room = searchParams.get("room");
  const fileId = searchParams.get("fileId");

  if (!room || !fileId) {
    return NextResponse.json({ error: "Missing room or fileId" }, { status: 400 });
  }

  const removed = removeFileFromRoom(room, fileId);
  return NextResponse.json({ success: removed });
}
