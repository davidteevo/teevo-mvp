import { getAppEnv } from "@/lib/app-env";

function keyMode(value: string | undefined): "test" | "live" | null {
  if (!value) return null;
  if (value.includes("_test_")) return "test";
  if (value.includes("_live_")) return "live";
  return null;
}

/**
 * Guard against using Stripe test keys in production (and live keys in non-prod).
 * This fails fast during route/module initialization with a clear message.
 */
export function assertStripeModeMatchesEnv(): void {
  const appEnv = getAppEnv();
  const secretMode = keyMode(process.env.STRIPE_SECRET_KEY);
  const publishableMode = keyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  const expectedMode = appEnv === "production" ? "live" : "test";
  const invalidSecret = secretMode != null && secretMode !== expectedMode;
  const invalidPublishable = publishableMode != null && publishableMode !== expectedMode;

  if (!invalidSecret && !invalidPublishable) {
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
      body: JSON.stringify({
        sessionId: "da8230",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "lib/stripe-env.ts:23",
        message: "stripe_mode_guard_passed",
        data: { appEnv, expectedMode, secretMode, publishableMode },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return;
  }

  const details = [
    `NEXT_PUBLIC_APP_ENV=${appEnv}`,
    secretMode ? `STRIPE_SECRET_KEY=${secretMode}` : "STRIPE_SECRET_KEY=unknown",
    publishableMode
      ? `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${publishableMode}`
      : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=unknown",
  ].join(", ");

  // #region agent log
  fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da8230" },
    body: JSON.stringify({
      sessionId: "da8230",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "lib/stripe-env.ts:49",
      message: "stripe_mode_guard_failed",
      data: { appEnv, expectedMode, secretMode, publishableMode },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  throw new Error(
    `Stripe mode mismatch: expected ${expectedMode} keys for ${appEnv}. ${details}. Update deployment environment variables and redeploy.`
  );
}
