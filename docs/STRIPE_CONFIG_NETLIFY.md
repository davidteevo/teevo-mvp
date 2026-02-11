# Configure Stripe for Teevo (Netlify)

Use this after your site is live on Netlify. Replace `YOUR_NETLIFY_URL` with your real URL (e.g. `teevo-mvp.netlify.app` or `app.teevo.com`).

---

## 1. Get your Stripe keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign in.
2. Turn **Test mode** ON (top right) for testing, or leave it OFF for real payments.
3. Open **Developers** → **API keys**.
4. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`) — click **Reveal** if needed.

---

## 2. Add Stripe keys to Netlify

1. In [Netlify](https://app.netlify.com), open your site → **Site configuration** → **Environment variables**.
2. Add (or update) these:

| Key | Value | Scopes |
|-----|--------|--------|
| `STRIPE_SECRET_KEY` | Your **Secret key** from step 1 | Production (and Deploy previews if you want) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your **Publishable key** from step 1 | Production (and Deploy previews if you want) |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR_NETLIFY_URL` (no trailing slash) | Production |

3. Save. Then trigger a **new deploy** (Deploys → **Trigger deploy** → **Deploy site**) so the app picks up the new variables.

---

## 3. Create the webhook in Stripe

1. In Stripe go to **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:**  
   `https://YOUR_NETLIFY_URL/api/webhooks/stripe`  
   Example: `https://teevo-mvp.netlify.app/api/webhooks/stripe`
3. Click **Select events** and add:
   - `checkout.session.completed`
   - `charge.refunded`
4. Click **Add endpoint**.
5. On the new endpoint’s page, open **Signing secret** → **Reveal** and copy it (starts with `whsec_`).

---

## 4. Add webhook secret to Netlify

1. Back in Netlify → **Site configuration** → **Environment variables**.
2. Add:
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** The `whsec_...` signing secret from step 3.
3. Save and trigger another **Deploy site** so the new secret is used.

---

## 5. Turn on Stripe Connect (for sellers)

1. In Stripe go to **Connect** → **Settings** (or **Get started**).
2. Complete any onboarding so **Connect** is enabled.
3. The app uses **Express** accounts (GB). No extra products or settings are required in the Dashboard.

---

## 6. Quick test

1. On your live site, sign up and (if needed) make yourself admin in Supabase.
2. Create a test listing and approve it as admin.
3. As a seller, go to Dashboard and complete **Connect Stripe** (use Stripe’s test data in test mode).
4. As a buyer, open the listing and click **Buy now** — pay with test card `4242 4242 4242 4242`.
5. In Stripe **Developers** → **Webhooks** → your endpoint, check that `checkout.session.completed` shows as **Succeeded**. In your app, the listing should show as sold and the transaction should appear in Dashboard.

---

## Summary

| Where | What |
|-------|------|
| **Netlify env vars** | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` |
| **Stripe Webhooks** | Endpoint `https://YOUR_NETLIFY_URL/api/webhooks/stripe`, events: `checkout.session.completed`, `charge.refunded` |
| **Stripe Connect** | Enabled; Express accounts (GB) used by the app |

After any env var change, trigger a new deploy in Netlify.
