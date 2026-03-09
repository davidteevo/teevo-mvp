# Schedule the expire-offers cron on Netlify

This runs the “expire offers” job every hour so offers past their 24h window are marked expired.

## What’s already in the repo

- **`netlify/functions/expire-offers-cron.ts`** – Scheduled function that calls your app’s `/api/cron/expire-offers` with your secret.
- **`netlify.toml`** – Schedule for that function: `@hourly` (every hour at minute 0 UTC).

## Step-by-step

### 1. Set environment variables in Netlify

1. Open [Netlify Dashboard](https://app.netlify.com) and select your site.
2. Go to **Site configuration** → **Environment variables** (or **Site settings** → **Environment variables**).
3. Click **Add a variable** / **Add environment variable** → **Add a single variable**.
4. Add:

   - **Key:** `CRON_SECRET`  
     **Value:** your long random secret (e.g. the one from your `.env.local`).  
     **Scopes:** check **All scopes** (or at least Production).

   - **Key:** `SITE_URL`  
     **Value:** your production site URL, e.g. `https://your-site-name.netlify.app` (no trailing slash).  
     **Scopes:** **All scopes**.

5. Save. If the site is already deployed, trigger a new deploy so the function gets the new vars (see step 3).

### 2. Confirm the schedule in `netlify.toml`

In the repo you should have:

```toml
[functions."expire-offers-cron"]
  schedule = "@hourly"
```

- `@hourly` = every hour at minute 0 (UTC).  
- For every 15 minutes use: `schedule = "*/15 * * * *"` (cron form).  
- For every 30 minutes use: `schedule = "*/30 * * * *"`.

Commit and push if you change it.

### 3. Deploy

- Push the branch that contains `netlify/functions/expire-offers-cron.ts` and the `netlify.toml` schedule.
- Let Netlify build and deploy (or trigger a deploy from the Netlify UI).

### 4. Check that the scheduled function exists

1. In Netlify: **Site** → **Functions**.
2. Find **expire-offers-cron** and confirm it has a **Scheduled** badge and a next run time (e.g. “Next run: today at 15:00 UTC”).

### 5. (Optional) Run it once to test

1. In **Functions**, click **expire-offers-cron**.
2. Click **Run now** (or **Invoke**).
3. In **Logs** (or **Function log**), you should see something like: `expire-offers-cron: OK {"expired":0}` (or a number of expired offers).  
   If you see `SITE_URL or URL not set` or `CRON_SECRET not set`, fix the env vars and redeploy.

### 6. If you use a custom domain

Set **SITE_URL** to that domain, e.g. `https://teevo.co.uk`, so the function calls your real app URL (the one that serves `/api/cron/expire-offers`).

---

## Summary

| Step | Action |
|------|--------|
| 1 | In Netlify, set **CRON_SECRET** and **SITE_URL** (production URL). |
| 2 | Keep **schedule** in `netlify.toml` (e.g. `@hourly`). |
| 3 | Deploy (push or “Trigger deploy”). |
| 4 | Under **Functions**, confirm **expire-offers-cron** is **Scheduled**. |
| 5 | Optionally **Run now** and check logs. |

Scheduled functions on Netlify only run on the **production** deploy, not on branch deploys or previews.
