import { NextResponse } from "next/server";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";

// Bounded in-memory idempotency cache for webhook deduplication within instance lifetime
const processedIdempotencyKeys = new Set<string>();
const MAX_CACHE_KEYS = 5000;

export async function POST(req: Request) {
  try {
    // 1. Read exact RAW request body before any JSON parsing
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const idempotencyKey = req.headers.get("x-idempotency-key");

    // 2. Cryptographic signature verification + replay window check
    const verification = verifyCashfreeWebhookSignature({
      signature,
      timestamp,
      rawBody,
    });

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Unauthorized webhook signature" },
        { status: 401 }
      );
    }

    // 3. Idempotency check
    if (idempotencyKey) {
      if (processedIdempotencyKeys.has(idempotencyKey)) {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
      if (processedIdempotencyKeys.size >= MAX_CACHE_KEYS) {
        processedIdempotencyKeys.clear();
      }
      processedIdempotencyKeys.add(idempotencyKey);
    }

    // 4. Parse verified event payload safely
    const payload = JSON.parse(rawBody);
    const eventType = payload?.type;
    const orderId = payload?.data?.order?.order_id;
    const paymentStatus = payload?.data?.payment?.payment_status;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" && paymentStatus === "SUCCESS") {
      console.info(`Verified Cashfree webhook success for order ${orderId}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Cashfree webhook error:", error?.message || "Invalid payload");
    return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
  }
}
