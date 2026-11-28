import { NextResponse } from "next/server";
import { getCashfreeClient, isCashfreeProduction } from "@/lib/cashfree";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const key = typeof body?.licenseKey === "string" ? body.licenseKey.trim() : "";

    if (!key || key.length < 6) {
      return NextResponse.json(
        { valid: false, error: "Please enter a valid license key or Order ID." },
        { status: 400 }
      );
    }

    // 1. Sandbox demo key (strictly disabled in Production)
    if (!isCashfreeProduction() && key === "DEMO-PRO-2026") {
      return NextResponse.json({ valid: true, plan: "Sandbox Demo Pro" });
    }

    // 2. Check configured server license keys (comma-separated in env PRO_LICENSE_KEYS)
    const configuredKeys = (process.env.PRO_LICENSE_KEYS || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (configuredKeys.includes(key)) {
      return NextResponse.json({ valid: true, plan: "Verified Pro License" });
    }

    // 3. Support activating with a verified paid Cashfree Order ID (dd_..., docdrop_..., or order_...)
    if (/^(dd|docdrop|order)_[a-zA-Z0-9_-]{4,64}$/i.test(key)) {
      try {
        const cashfree = getCashfreeClient();
        const orderRes = await cashfree.PGFetchOrder(key);
        if (orderRes.data?.order_status === "PAID") {
          return NextResponse.json({ valid: true, plan: "Verified Cashfree Order" });
        }
      } catch {
        // Order lookup failed or not configured
      }
    }

    return NextResponse.json(
      { valid: false, error: "Invalid or expired license key." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { valid: false, error: "License verification failed." },
      { status: 500 }
    );
  }
}
