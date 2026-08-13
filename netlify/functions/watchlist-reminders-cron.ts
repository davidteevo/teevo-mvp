/**
 * Netlify Scheduled Function: Watchlist still-available reminders.
 * Calls the Next.js cron route so we reuse app code (path aliases, helpers).
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
    console.error("watchlist-reminders-cron: NEXT_PUBLIC_APP_URL (or URL) must be set");
    return;
  }
  try {
    const res = await fetch(`${site}/api/cron/watchlist-reminders`, {
      headers: secret
        ? { Authorization: `Bearer ${secret}`, "x-cron-secret": secret }
        : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("watchlist-reminders-cron: HTTP", res.status, text);
      return;
    }
    console.log("watchlist-reminders-cron: OK", text);
  } catch (e) {
    console.error("watchlist-reminders-cron: failed", e);
  }
};
