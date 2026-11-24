import { NextResponse } from "next/server";
import { getCashfreeClient } from "@/lib/cashfree";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.redirect(new URL("/?payment=error", req.url));
  }

  try {
    const cashfree = getCashfreeClient();
    const response = await cashfree.PGFetchOrder(orderId);
    const status = response.data?.order_status;

    if (status === "PAID") {
      return NextResponse.redirect(new URL(`/?payment=success&order_id=${encodeURIComponent(orderId)}`, req.url));
    } else {
      return NextResponse.redirect(new URL(`/?payment=pending&status=${status || "unknown"}&order_id=${encodeURIComponent(orderId)}`, req.url));
    }
  } catch (error) {
    console.error("Cashfree GET verification error:", error);
    return NextResponse.redirect(new URL("/?payment=failed", req.url));
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const cashfree = getCashfreeClient();
    const response = await cashfree.PGFetchOrder(orderId);
    const orderStatus = response.data?.order_status;

    return NextResponse.json({
      success: orderStatus === "PAID",
      orderStatus,
      orderId: response.data?.order_id,
      orderAmount: response.data?.order_amount,
      currency: response.data?.order_currency,
    });
  } catch (error: any) {
    console.error("Cashfree POST verification error:", error?.response?.data || error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Cashfree order status" },
      { status: 500 }
    );
  }
}
