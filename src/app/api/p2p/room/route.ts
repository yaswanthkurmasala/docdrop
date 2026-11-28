import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRoom, getRoom, touchDevice } from "@/lib/p2p-rooms";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const room = searchParams.get("room");
  const pin = searchParams.get("pin") || "";

  if (!room) {
    return NextResponse.json({ error: "Missing 'room' parameter" }, { status: 400 });
  }

  const roomState = pin ? getOrCreateRoom(room, pin) : getRoom(room);
  if (!roomState) {
    return NextResponse.json({ error: "Room not found or expired" }, { status: 404 });
  }

  // Return sanitized room info without raw binary buffers
  return NextResponse.json({
    success: true,
    roomId: roomState.roomId,
    pin: roomState.pin,
    laptopOnline: roomState.laptopOnline,
    phoneOnline: roomState.phoneOnline,
    phoneDeviceName: roomState.phoneDeviceName,
    files: roomState.files.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      direction: f.direction,
      timestamp: f.timestamp,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, pin = "", device = "laptop", deviceName } = body;

    if (!room) {
      return NextResponse.json({ error: "Missing 'room' parameter" }, { status: 400 });
    }

    const roomState = getOrCreateRoom(room, pin);
    touchDevice(room, device, deviceName);

    return NextResponse.json({
      success: true,
      roomId: roomState.roomId,
      laptopOnline: roomState.laptopOnline,
      phoneOnline: roomState.phoneOnline,
      phoneDeviceName: roomState.phoneDeviceName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Invalid room request" }, { status: 500 });
  }
}
