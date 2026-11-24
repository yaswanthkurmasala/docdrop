import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCashfreeClient, isCashfreeProduction } from "@/lib/cashfree";
import { resolvePlanAmountInr } from "@/lib/pricing-plans";

const ALLOWED_ORIGINS = new Set([
  "https://docdrop-five.vercel.app",
  "https://docdrop-yaswanthkurmasala1.vercel.app",
  "http://localhost:3000",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveSafeOrigin(req: Request): string {
  const fallback = "https://docdrop-five.vercel.app";
  const reqOrigin = req.headers.get("origin");
  if (!reqOrigin) return process.env.NEXT_PUBLIC_SITE_URL || fallback;

  try {
    const parsed = new URL(reqOrigin);
    if (ALLOWED_ORIGINS.has(parsed.origin)) {
      return parsed.origin;
    }
    if (parsed.hostname.endsWith(".vercel.app") && parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch {
    // ignore invalid origin
  }
  return fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planName, planPrice, customerEmail, customerPhone, customerName } = body || {};

    if (typeof customerEmail !== "string" || !EMAIL_REGEX.test(customerEmail.trim())) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Recompute canonical INR order amount strictly server-side
    const { amount: orderAmount } = resolvePlanAmountInr(
      typeof planName === "string" ? planName : "",
      typeof planPrice === "string" ? planPrice : ""
    );

    if (![49, 99, 499, 999].includes(orderAmount)) {
      return NextResponse.json(
        { error: "Invalid subscription plan selected." },
        { status: 400 }
      );
    }

    // Generate cryptographically unpredictable order ID
    const entropy = crypto.randomBytes(8).toString("hex");
    const orderId = `dd_${Date.now()}_${entropy}`;

    const cleanPhone =
      (typeof customerPhone === "string" ? customerPhone : "9999999999")
        .replace(/[^0-9]/g, "")
        .slice(-10) || "9999999999";

    const rawName =
      typeof customerName === "string" && customerName.trim().length > 0
        ? customerName.trim()
        : customerEmail.split("@")[0].replace(/[._]/g, " ");
    const cleanName = rawName.replace(/[^a-zA-Z0-9 ._-]/g, "").slice(0, 60) || "DocDrop User";

    const cashfree = getCashfreeClient();
    const safeOrigin = resolveSafeOrigin(req);

    const orderRequest = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: `cust_${crypto.createHash("sha256").update(customerEmail.trim().toLowerCase()).digest("hex").slice(0, 16)}`,
        customer_name: cleanName,
        customer_email: customerEmail.trim(),
        customer_phone: cleanPhone,
      },
      order_meta: {
        return_url: `${safeOrigin}/api/cashfree/verify?order_id={order_id}`,
        notify_url: `${safeOrigin}/api/cashfree/webhook`,
      },
      order_note: `DocDrop Pro Upgrade: ${typeof planName === "string" ? planName.slice(0, 50) : "Pro Pass"}`,
    };

    const response = await cashfree.PGCreateOrder(orderRequest);

    if (!response.data?.payment_session_id) {
      return NextResponse.json(
        { error: "Payment gateway did not return an active session." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      orderId: response.data.order_id,
      orderAmount,
      currency: "INR",
      environment: isCashfreeProduction() ? "PRODUCTION" : "SANDBOX",
    });
  } catch (error: any) {
    console.error("Cashfree create-order failed:", error?.message || "Unknown error");
    const isConfigError =
      typeof error?.message === "string" && error.message.includes("not configured");

    return NextResponse.json(
      {
        error: isConfigError
          ? "Payment gateway credentials are not configured on the server yet."
          : "Unable to initiate secure checkout. Please try again.",
      },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
