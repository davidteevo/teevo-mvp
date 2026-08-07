/**
 * Explicit app environment. Prefer this over hostname detection.
 * Set NEXT_PUBLIC_APP_ENV to: development | staging | production
 */
export type AppEnv = "development" | "staging" | "production";

const PRODUCTION_APP_URL = "https://app.teevohq.com";
const LOCAL_APP_URL = "http://localhost:3000";

export function getAppEnv(): AppEnv {
  const raw = (process.env.NEXT_PUBLIC_APP_ENV ?? "").trim().toLowerCase();
  if (raw === "staging" || raw === "production" || raw === "development") {
    return raw;
  }
  // Infer when unset: local Node/Next vs deployed builds
  if (process.env.NODE_ENV === "development") return "development";
  return "production";
}

export function isStaging(): boolean {
  return getAppEnv() === "staging";
}

export function isProduction(): boolean {
  return getAppEnv() === "production";
}

export function isDevelopment(): boolean {
  return getAppEnv() === "development";
}

/**
 * Canonical app origin (no trailing slash).
 * Always prefer NEXT_PUBLIC_APP_URL. Hardcoded production URL is only used
 * when APP_ENV is production (or unset and inferred as production) so a
 * misconfigured staging deploy does not silently send users to live.
 */
export function getAppUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;

  const env = getAppEnv();
  if (env === "staging") {
    return "https://test.teevohq.com";
  }
  if (env === "development") {
    return LOCAL_APP_URL;
  }
  return PRODUCTION_APP_URL;
}
