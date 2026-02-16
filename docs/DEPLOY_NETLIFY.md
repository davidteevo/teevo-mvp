# Deploy Teevo MVP on Netlify

Step-by-step instructions to deploy the Next.js app to Netlify (e.g. at `app.teevo.com` or `teevo-mvp.netlify.app`).

---

## Prerequisites

- Code in a **Git repository** (GitHub, GitLab, or Bitbucket).
- **Netlify account** at [netlify.com](https://www.netlify.com).
- Supabase and Stripe already set up (see `docs/SETUP_SUPABASE_STRIPE.md`).

---

## 1. Push your code to Git

If you haven’t already:

```bash
cd /Users/davidfox/teevo-mvp
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/teevo-mvp.git   # or your repo URL
git push -u origin main
```

Use your real repo URL and branch name (`main` or `master`).

---

## 2. Install the Netlify Next.js plugin (optional if added to repo)

The project includes `@netlify/plugin-nextjs` in `package.json` and `netlify.toml`. If you added them locally, run:

```bash
npm install
```

Commit and push so Netlify uses the plugin when it builds.

---

## 3. Create a new site on Netlify

1. Log in at [app.netlify.com](https://app.netlify.com).
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** (or GitLab/Bitbucket) and authorize Netlify if needed.
4. Pick the **repository** that contains `teevo-mvp` (or the repo you pushed).
5. Configure the build:
   - **Branch to deploy:** `main` (or your default branch).
   - **Build command:** `npm run build` (Netlify may pre-fill this).
   - **Publish directory:** leave blank — the Next.js plugin sets it.
   - **Base directory:** if the app lives in a subfolder (e.g. repo root is parent of `teevo-mvp`), set it to `teevo-mvp`. If the repo root *is* the app (you run `npm run build` at root), leave it blank.
6. Click **Deploy site** (you can add env vars before or after the first deploy).

The first deploy may fail until you add environment variables; that’s expected.

---

## 4. Set environment variables

In Netlify: **Site settings** → **Environment variables** → **Add a variable** (or **Import from .env**).

Add the same variables you use in `.env.local`:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` or `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for **this** Netlify URL | `whsec_...` |
| `NEXT_PUBLIC_APP_URL` | Full URL of your main app | `https://app.teevohq.com` or `https://teevo-mvp.netlify.app` |
| `NEXT_PUBLIC_ADMIN_DOMAIN` | (Optional) Admin-only domain; see [Admin domain](#admin-domain-adminteevohqcom) | `admin.teevohq.com` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | (Optional) Shared auth cookie domain so app + admin stay logged in; use when using admin subdomain | `.teevohq.com` |

- **Scopes:** enable these for **Production** (and optionally **Branch deploys** if you use previews).
- **Sensitive:** mark secret keys as “Sensitive” so they’re hidden in the UI.
- After changing env vars, trigger a **new deploy** (Deploys → Trigger deploy → Deploy site).

---

## 5. Configure Stripe webhook for production

1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:**  
   `https://YOUR_NETLIFY_SITE_URL/api/webhooks/stripe`  
   Examples:
   - `https://teevo-mvp.netlify.app/api/webhooks/stripe`
   - Or after custom domain: `https://app.teevo.com/api/webhooks/stripe`
3. **Events:** select `checkout.session.completed` and `charge.refunded`.
4. Save and copy the **Signing secret** (`whsec_...`).
5. In Netlify, add or update **Environment variable** `STRIPE_WEBHOOK_SECRET` with that value, then redeploy.

---

## 6. Configure Supabase redirect URLs

1. In [Supabase Dashboard](https://app.supabase.com) → your project → **Authentication** → **URL Configuration**.
2. **Site URL:** set to your Netlify URL, e.g. `https://teevo-mvp.netlify.app` or `https://app.teevo.com`.
3. **Redirect URLs:** add (one per line or comma-separated, per Supabase UI):
   - `https://teevo-mvp.netlify.app/auth/callback`
   - `https://teevo-mvp.netlify.app/**`
   - If using a custom domain, also add:
   - `https://app.teevo.com/auth/callback`
   - `https://app.teevo.com/**`

Save. This lets login/signup and Google OAuth redirect back to your Netlify site.

**For local development:** Add to Redirect URLs: `http://localhost:3000/auth/callback` and `http://localhost:3000/**`. Use a copy of `.env.example` as `.env.local` with your Supabase and Stripe keys; set `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Then `npm run dev` and open http://localhost:3000 and http://localhost:3000/admin.

---

## 7. (Optional) Custom domain – app.teevo.com

1. In Netlify: **Site settings** → **Domain management** → **Add custom domain** (or **Add domain alias**).
2. Enter `app.teevo.com` and follow Netlify’s steps (they’ll show the DNS records).
3. In your DNS provider (where teevo.com is managed):
   - Add a **CNAME** record: `app` → `YOUR_SITE_NAME.netlify.app` (Netlify shows the exact target),  
   - Or use Netlify’s **DNS** if you transfer the domain there.
4. Wait for DNS to propagate; Netlify will issue SSL for `app.teevo.com`.
5. Set **Site URL** in Supabase and **Stripe webhook URL** to `https://app.teevo.com/...` as above.
6. In Netlify env vars, set `NEXT_PUBLIC_APP_URL=https://app.teevo.com` and redeploy.

---

## 8. Trigger a deploy and test

1. **Deploys** → **Trigger deploy** → **Deploy site** (or push a commit).
2. When the build finishes, open your site URL.
3. Test: sign up, create a listing, (as admin) approve it, connect Stripe, and run a test payment. Check **Stripe** → **Webhooks** for the endpoint’s event log and any failures.

---

## Admin domain (admin.teevohq.com)

You can serve the admin area on a separate domain so admins use `https://admin.teevohq.com` and always land on the admin dashboard.

**How it works:** The same Netlify site is used for both the main app and the admin domain. When a request comes to `admin.teevohq.com`, the app redirects `/` to `/admin` and redirects any non-admin path (e.g. `/sell`, `/listing/123`) to your main site URL so only admin routes are used on that host.

**Steps:**

1. **Add the domain in Netlify**  
   Site settings → **Domain management** → **Add custom domain** (or **Add domain alias**). Enter `admin.teevohq.com` and follow Netlify’s instructions (e.g. add a CNAME for `admin` to your Netlify site). Wait for DNS and SSL.

2. **Set environment variables** (same site, so same env):  
   - `NEXT_PUBLIC_APP_URL` = your main site URL (e.g. `https://app.teevohq.com`).  
   - `NEXT_PUBLIC_ADMIN_DOMAIN` = `admin.teevohq.com`  
   - `NEXT_PUBLIC_COOKIE_DOMAIN` = `.teevohq.com` (so the auth cookie is shared: logging in on app or admin keeps you logged in on both).

   Trigger a new deploy after changing env vars.

3. **Supabase (optional)**  
   If admins will log in via the admin domain, add to **Redirect URLs**:  
   `https://admin.teevohq.com/auth/callback` and `https://admin.teevohq.com/**`

After this, visiting `https://admin.teevohq.com` redirects to `https://admin.teevohq.com/admin`. Visiting `https://admin.teevohq.com/sell` redirects to `https://app.teevohq.com/sell`.

### If Netlify redirects admin → app (alias redirects to primary)

Netlify can redirect domain aliases to the primary domain. To serve the same site on both `app.teevohq.com` and `admin.teevohq.com` without either redirecting to the other, use a **dummy primary domain**:

1. In **Domain management**, add a third domain that will act only as primary (e.g. `placeholder.teevohq.com` or your Netlify subdomain like `ephemeral-zabaione-cd0545.netlify.app`).
2. Set that domain as **primary** (Options → **Set as primary domain**).
3. Ensure **app.teevohq.com** and **admin.teevohq.com** are both **domain aliases** (not primary).
4. Netlify’s automatic redirect from alias → primary then no longer forces traffic between your real domains; each alias is served as-is.

If you use a placeholder subdomain (e.g. `placeholder.teevohq.com`), it does not need to be reachable in DNS; it only needs to be set as primary in Netlify. Alternatively, use your existing `*.netlify.app` subdomain as primary so both custom domains remain aliases.

---

## Troubleshooting

- **Build fails:** Check the build log. Common fixes: run `npm run build` locally, fix TypeScript/ESLint errors, and ensure **Node version** is 18+ (in Netlify: **Site settings** → **Build & deploy** → **Environment** → **Node version**).
- **404 on API routes:** The Next.js plugin must be active. Ensure `netlify.toml` has the `@netlify/plugin-nextjs` plugin and the package is in `package.json`; redeploy.
- **Webhook returns 400:** Verify `STRIPE_WEBHOOK_SECRET` in Netlify matches the signing secret for the **production** webhook endpoint URL (not the CLI secret).
- **Auth redirect fails:** Confirm Supabase redirect URLs exactly match your Netlify (or custom) URL and path (`/auth/callback`, `/**`).
