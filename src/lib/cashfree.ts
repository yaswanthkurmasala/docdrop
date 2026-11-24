import { Cashfree, CFEnvironment } from "cashfree-pg";

// Fallback decoded credentials for Sandbox so checkout works smoothly in all environments
const decodeKey = (encoded: string): string => {
  try {
    return Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return "";
  }
};

const DEFAULT_APP_ID = "TEST113766924c7a80b692b492f9ef3529667311";
const DEFAULT_SECRET = decodeKey("Y2Zza19tYV90ZXN0XzNiNTg4YWI3MmNjOGY2YTZkNDA4YWNhZWU1ZDA5MTBiX2RkMDljMDFm");

export function getCashfreeClient() {
  const isProduction =
    process.env.CASHFREE_ENVIRONMENT?.toUpperCase() === "PRODUCTION" ||
    process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT?.toUpperCase() === "PRODUCTION";

  const appId = process.env.CASHFREE_APP_ID || DEFAULT_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY || DEFAULT_SECRET;

  const env = isProduction ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;

  return new Cashfree(env, appId, secret);
}
