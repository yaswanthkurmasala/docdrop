import crypto from "crypto";
import { Cashfree, CFEnvironment } from "cashfree-pg";

const WEBHOOK_TOLERANCE_SECONDS = 300; // 5-minute replay protection window

export function isCashfreeProduction(): boolean {
  return process.env.CASHFREE_ENVIRONMENT?.toUpperCase() === "PRODUCTION";
}

export function getCashfreeCredentials(): { appId: string; secretKey: string } {
  const appId = (process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || "").trim();

  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree server credentials (CASHFREE_APP_ID / CASHFREE_SECRET_KEY) are not configured in environment variables."
    );
  }

  return { appId, secretKey };
}

export function getCashfreeClient(): Cashfree {
  const { appId, secretKey } = getCashfreeCredentials();
  const env = isCashfreeProduction() ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  return new Cashfree(env, appId, secretKey);
}

/**
 * Cryptographically verifies Cashfree v2025-01-01 webhook signatures against raw request payload
 * using constant-time comparison and timestamp replay protection.
 */
export function verifyCashfreeWebhookSignature(params: {
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
}): { valid: boolean; reason?: string } {
  const { signature, timestamp, rawBody } = params;

  if (!signature || !timestamp || !rawBody) {
    return { valid: false, reason: "Missing required signature headers or payload" };
  }

  // Enforce 5-minute replay window (handles timestamps in seconds or milliseconds)
  const parsedTs = Number(timestamp);
  if (!Number.isFinite(parsedTs)) {
    return { valid: false, reason: "Invalid webhook timestamp format" };
  }
  const tsSeconds = parsedTs > 1e12 ? parsedTs / 1000 : parsedTs;
  const nowSeconds = Date.now() / 1000;
  if (Math.abs(nowSeconds - tsSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: "Webhook timestamp expired (replay protection)" };
  }

  const { secretKey } = getCashfreeCredentials();
  const signedPayload = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(signedPayload)
    .digest("base64");

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");

  if (sigBuf.length !== expectedBuf.length) {
    return { valid: false, reason: "Signature mismatch" };
  }

  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: "Signature mismatch" };
  }

  return { valid: true };
}
