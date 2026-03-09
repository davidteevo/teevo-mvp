# Schedule the expire-offers cron on Netlify

This runs the “expire offers” job every hour so offers past their 24h window are marked expired.

## What’s already in the repo

- **`netlify/functions/expire-offers-cron.ts`** – Scheduled function that expires offers **directly in Supabase** (no call to the Next.js API). So it works even if the API route isn’t available.
- **`netlify.toml`** – Schedule for that function: `@hourly` (every hour at minute 0 UTC).

## Step-by-step

### 1. Environment variables in Netlify

The function uses the **same Supabase env vars** as your app:

- **`NEXT_PUBLIC_SUPABASE_URL`** (or **`SUPABASE_URL`**)
- **`SUPABASE_SERVICE_ROLE_KEY`**

If your site already has these set (for the Next.js app), the cron will use them. No `CRON_SECRET` or `SITE_URL` needed for this function.

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
3. In **Logs** (or **Function log**), you should see: `expire-offers-cron: OK expired=0` (or a number of expired offers).  
   If you see `NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set`, add those env vars in Netlify and redeploy.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Ensure **NEXT_PUBLIC_SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY** are set in Netlify (same as for your app). |
| 2 | Keep **schedule** in `netlify.toml` (e.g. `@hourly`). |
| 3 | Deploy (push or “Trigger deploy”). |
| 4 | Under **Functions**, confirm **expire-offers-cron** is **Scheduled**. |
| 5 | Optionally **Run now** and check logs. |

Scheduled functions on Netlify only run on the **production** deploy, not on branch deploys or previews.
