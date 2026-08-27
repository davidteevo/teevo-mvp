/**
 * Netlify Scheduled Function: Weekly Creator Roundup.
 * Fires Mon 08:00 and 09:00 UTC; app gates on Europe/London Monday 09:00.
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
    console.error("creator-weekly-roundup-cron: NEXT_PUBLIC_APP_URL (or URL) must be set");
    return;
  }
  try {
    const res = await fetch(`${site}/api/cron/creator-weekly-roundup`, {
      headers: secret
        ? { Authorization: `Bearer ${secret}`, "x-cron-secret": secret }
        : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("creator-weekly-roundup-cron: HTTP", res.status, text);
      return;
    }
    console.log("creator-weekly-roundup-cron: OK", text);
  } catch (e) {
    console.error("creator-weekly-roundup-cron: failed", e);
  }
};
