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
    return;
  }

  const details = [
    `NEXT_PUBLIC_APP_ENV=${appEnv}`,
    secretMode ? `STRIPE_SECRET_KEY=${secretMode}` : "STRIPE_SECRET_KEY=unknown",
    publishableMode
      ? `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${publishableMode}`
      : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=unknown",
  ].join(", ");

  throw new Error(
    `Stripe mode mismatch: expected ${expectedMode} keys for ${appEnv}. ${details}. Update deployment environment variables and redeploy.`
  );
}
