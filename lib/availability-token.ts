import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;

export type AvailabilityTokenPayload = {
  batchId: string;
  sellerId: string;
  exp: number;
};

function tokenSecret(): string {
  const secret =
    process.env.AVAILABILITY_TOKEN_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("AVAILABILITY_TOKEN_SECRET (or CRON_SECRET) is not set");
  }
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", tokenSecret()).update(payloadB64).digest("base64url");
}

export function createAvailabilityToken(batchId: string, sellerId: string): string {
  const payload: AvailabilityTokenPayload = {
    batchId,
    sellerId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyAvailabilityToken(token: string): AvailabilityTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected: string;
  try {
    expected = sign(payloadB64);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as AvailabilityTokenPayload;
    if (!payload?.batchId || !payload?.sellerId || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
