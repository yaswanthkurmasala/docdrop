import { NextResponse } from "next/server";
import { getCashfreeClient } from "@/lib/cashfree";

const ORDER_ID_REGEX = /^(dd|docdrop)_[a-zA-Z0-9_-]{6,64}$/;
const VALID_PLAN_AMOUNTS = new Set([49, 99, 499, 999]);

async function verifyOrderWithCashfree(orderId: string) {
  if (!ORDER_ID_REGEX.test(orderId)) {
    return { verified: false, reason: "Invalid order reference format" };
  }

  const cashfree = getCashfreeClient();
  const response = await cashfree.PGFetchOrder(orderId);
  const data = response.data;

  if (!data) {
    return { verified: false, reason: "Order not found" };
  }

  const orderStatus = data.order_status;
  const orderAmount = Number(data.order_amount);
  const currency = data.order_currency;

  const isPaid =
    orderStatus === "PAID" &&
    currency === "INR" &&
    VALID_PLAN_AMOUNTS.has(orderAmount);

  return {
    verified: isPaid,
    orderStatus,
    orderId: data.order_id,
    orderAmount,
    currency,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId || !ORDER_ID_REGEX.test(orderId)) {
    return NextResponse.redirect(new URL("/?payment=error", req.url));
  }

  try {
    const verification = await verifyOrderWithCashfree(orderId);

    if (verification.verified) {
      return NextResponse.redirect(
        new URL(`/?verify_payment=1&order_id=${encodeURIComponent(orderId)}`, req.url)
      );
    }

    return NextResponse.redirect(
      new URL(
        `/?payment=pending&status=${encodeURIComponent(verification.orderStatus || "PENDING")}&order_id=${encodeURIComponent(orderId)}`,
        req.url
      )
    );
  } catch (error: any) {
    console.error("Cashfree GET verification failed:", error?.message || "Unknown error");
    return NextResponse.redirect(new URL("/?payment=failed", req.url));
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId || !ORDER_ID_REGEX.test(orderId)) {
      return NextResponse.json(
        { verified: false, success: false, error: "Valid orderId is required" },
        { status: 400 }
      );
    }

    const verification = await verifyOrderWithCashfree(orderId);

    return NextResponse.json({
      verified: verification.verified,
      success: verification.verified,
      orderStatus: verification.orderStatus,
      orderId: verification.orderId,
      orderAmount: verification.orderAmount,
      currency: verification.currency,
    });
  } catch (error: any) {
    console.error("Cashfree POST verification failed:", error?.message || "Unknown error");
    return NextResponse.json(
      { verified: false, success: false, error: "Could not verify payment status." },
      { status: 500 }
    );
  }
}
