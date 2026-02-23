# Supabase auth rate limits

If you see **"Request rate limit reached"** or **"Too many requests"** when signing in or signing up (even with a single user testing), Supabase Auth is applying its per-IP rate limits.

## Quick fix: wait

Limits are usually per hour. Wait **10–60 minutes** and try again.

## Increase limits (recommended for development / low traffic)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Authentication** → **Rate Limits** (or **Auth** → **Rate Limits**).
3. Adjust the limits that apply to sign-in/sign-up (e.g. increase requests per hour or burst size).
4. Save.

Exact options depend on your Supabase plan. If the UI doesn’t show sign-in limits, you can use the [Management API](https://supabase.com/docs/guides/auth/rate-limits) with an access token from **Account** → **Access Tokens**.

## What counts toward the limit

Each login can trigger several auth calls (sign-in, session checks, token refresh, middleware, profile sync). The app has been tuned to avoid an extra `getSession()` after login, but each page load and navigation still uses auth. Running many logins or refreshes in a short time can hit the limit.

## If you hit the limit often

- Increase the relevant rate limits in the Dashboard as above.
- Avoid rapid repeated sign-in/sign-up during testing (e.g. wait a minute between attempts).
- For production, consider a paid plan with higher/default limits.
