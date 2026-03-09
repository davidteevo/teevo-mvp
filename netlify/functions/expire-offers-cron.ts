/**
 * Netlify Scheduled Function: calls the Next.js API to expire old offers.
 * Schedule is set in netlify.toml. Requires env vars: SITE_URL, CRON_SECRET.
 */
export default async (_req: Request) => {
  const siteUrl = process.env.SITE_URL || process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!siteUrl) {
    console.error("expire-offers-cron: SITE_URL or URL not set");
    return;
  }
  if (!secret) {
    console.error("expire-offers-cron: CRON_SECRET not set");
    return;
  }
  const url = `${siteUrl.replace(/\/$/, "")}/api/cron/expire-offers`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("expire-offers-cron:", res.status, text);
      return;
    }
    console.log("expire-offers-cron: OK", text);
  } catch (err) {
    console.error("expire-offers-cron: fetch failed", err);
  }
};
