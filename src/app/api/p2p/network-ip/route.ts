import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    let localIp = "127.0.0.1";

    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;

      for (const iface of ifaceList) {
        // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        if (iface.family === "IPv4" && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
      if (localIp !== "127.0.0.1") break;
    }

    return NextResponse.json({
      success: true,
      ip: localIp,
      hostname: os.hostname(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to detect local IP" },
      { status: 500 }
    );
  }
}
