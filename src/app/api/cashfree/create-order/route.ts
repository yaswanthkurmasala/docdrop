import { NextResponse } from "next/server";
import { getCashfreeClient } from "@/lib/cashfree";
import { resolvePlanAmountInr } from "@/lib/pricing-plans";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planName, planPrice, customerEmail, customerPhone, customerName } = body;

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    const { amount: orderAmount } = resolvePlanAmountInr(planName || "", planPrice || "");
    const orderId = `docdrop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanPhone = (customerPhone || "9999999999").replace(/[^0-9]/g, "").slice(-10) || "9999999999";
    const cleanName = customerName || customerEmail.split("@")[0].replace(/[._]/g, " ") || "DocDrop Member";

    const cashfree = getCashfreeClient();

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://docdrop-five.vercel.app";
    const cleanOrigin = origin.replace(/\/$/, "");

    const orderRequest = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: `cust_${Date.now()}`,
        customer_name: cleanName,
        customer_email: customerEmail,
        customer_phone: cleanPhone,
      },
      order_meta: {
        return_url: `${cleanOrigin}/api/cashfree/verify?order_id={order_id}`,
      },
      order_note: `DocDrop Pro Upgrade: ${planName || "Pro Pass"}`,
    };

    const response = await cashfree.PGCreateOrder(orderRequest);

    if (!response.data || !response.data.payment_session_id) {
      return NextResponse.json(
        { error: "Failed to generate payment session with Cashfree" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      orderId: response.data.order_id,
      orderAmount,
      currency: "INR",
      environment: process.env.CASHFREE_ENVIRONMENT || "SANDBOX",
    });
  } catch (error: any) {
    console.error("Cashfree create-order error:", error?.response?.data || error);
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Unable to initiate Cashfree order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
