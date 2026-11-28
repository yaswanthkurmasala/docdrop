/**
 * In-Memory P2P Ephemeral Room Store for DocDrop
 * Enables high-speed, zero-cloud peer-to-peer file transfer between
 * smartphones and laptops on the same Wi-Fi or network.
 *
 * Files are held only in volatile memory buffer until fetched,
 * and automatically purged after retrieval or timeout.
 */

export interface P2PFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  direction: "phone-to-laptop" | "laptop-to-phone";
  data: Buffer;
  timestamp: number;
}

export interface P2PRoomState {
  roomId: string;
  pin: string;
  createdAt: number;
  lastActiveAt: number;
  laptopOnline: boolean;
  phoneOnline: boolean;
  phoneDeviceName?: string;
  files: P2PFileItem[];
}

// Global in-memory room store (preserved across requests in Node.js runtime)
declare global {
  // eslint-disable-next-line no-var
  var __DOCDROP_P2P_ROOMS__: Map<string, P2PRoomState> | undefined;
}

const rooms = global.__DOCDROP_P2P_ROOMS__ ?? new Map<string, P2PRoomState>();
global.__DOCDROP_P2P_ROOMS__ = rooms;

// Auto-cleanup expired rooms (older than 1 hour) every 5 minutes
const ROOM_TTL_MS = 60 * 60 * 1000;
const FILE_TTL_MS = 15 * 60 * 1000;

export function cleanExpiredRooms(): void {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActiveAt > ROOM_TTL_MS) {
      rooms.delete(roomId);
      continue;
    }
    // Clean old files in room
    room.files = room.files.filter((f) => now - f.timestamp < FILE_TTL_MS);
  }
}

export function getOrCreateRoom(roomId: string, pin: string): P2PRoomState {
  cleanExpiredRooms();
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      pin,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      laptopOnline: true,
      phoneOnline: false,
      files: [],
    };
    rooms.set(roomId, room);
  } else {
    room.lastActiveAt = Date.now();
  }
  return room;
}

export function getRoom(roomId: string): P2PRoomState | null {
  cleanExpiredRooms();
  const room = rooms.get(roomId);
  if (room) {
    room.lastActiveAt = Date.now();
    return room;
  }
  return null;
}

export function touchDevice(
  roomId: string,
  device: "laptop" | "phone",
  deviceName?: string
): P2PRoomState | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.lastActiveAt = Date.now();
  if (device === "laptop") {
    room.laptopOnline = true;
  } else if (device === "phone") {
    room.phoneOnline = true;
    if (deviceName) room.phoneDeviceName = deviceName;
  }
  return room;
}

export function addFileToRoom(
  roomId: string,
  fileMeta: {
    name: string;
    size: number;
    type: string;
    direction: "phone-to-laptop" | "laptop-to-phone";
    buffer: Buffer;
  }
): P2PFileItem | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const fileItem: P2PFileItem = {
    id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: fileMeta.name,
    size: fileMeta.size,
    type: fileMeta.type || "application/octet-stream",
    direction: fileMeta.direction,
    data: fileMeta.buffer,
    timestamp: Date.now(),
  };

  room.files.push(fileItem);
  room.lastActiveAt = Date.now();
  return fileItem;
}

export function getFileFromRoom(roomId: string, fileId: string): P2PFileItem | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  return room.files.find((f) => f.id === fileId) || null;
}

export function removeFileFromRoom(roomId: string, fileId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const initialLen = room.files.length;
  room.files = room.files.filter((f) => f.id !== fileId);
  return room.files.length < initialLen;
}
