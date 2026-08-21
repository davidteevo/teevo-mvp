/**
 * Netlify Scheduled Function: Admin new-users digest.
 * Calls the Next.js cron route so we reuse app code (path aliases, helpers).
 * Schedule fires at 17:00 and 18:00 UTC; the route gates on Europe/London hour === 18.
 */
export default async (_req: Request) => {
  const site = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL ||
    process.env.SITE_URL ||
    ""
  ).replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!site) {
    console.error("admin-new-users-digest-cron: NEXT_PUBLIC_APP_URL (or URL) must be set");
    return;
  }
  try {
    const res = await fetch(`${site}/api/cron/admin-new-users-digest`, {
      headers: secret
        ? { Authorization: `Bearer ${secret}`, "x-cron-secret": secret }
        : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("admin-new-users-digest-cron: HTTP", res.status, text);
      return;
    }
    console.log("admin-new-users-digest-cron: OK", text);
  } catch (e) {
    console.error("admin-new-users-digest-cron: failed", e);
  }
};
