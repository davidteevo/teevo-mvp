import { PostHog } from "posthog-node";

let client: PostHog | null | undefined;

export function getPostHogClient(): PostHog | null {
  if (client !== undefined) return client;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) {
    if (process.env.NODE_ENV !== "production") {
      const missingVariable = token
        ? "NEXT_PUBLIC_POSTHOG_HOST"
        : "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";
      console.warn(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
      );
    }
    client = null;
    return client;
  }

  client = new PostHog(token, {
    host,
    enableExceptionAutocapture: true,
    privacyMode: false,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2000,
    fetchRetryCount: 0,
  });
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, string | number | boolean | null>
): Promise<void> {
  const posthog = getPostHogClient();
  if (!posthog) return;

  posthog.capture({ distinctId, event, properties });
  await posthog.flush().catch(() => {});
}
