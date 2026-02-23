# Debugging emails (Resend + Supabase hook)

Teevo sends two kinds of emails:

1. **Auth emails** (signup verification, forgot password) – Supabase calls your **Send Email** hook → your app sends via Resend.
2. **Transactional emails** (order confirmation, shipping, funds released) – your app calls `sendEmail()` from Stripe webhook and transaction APIs.

Use this checklist to find why emails aren’t arriving.

---

## 1. Auth emails (signup / forgot password)

### Signup verification not sending?

**Supabase must have "Confirm email" turned on**, or it will never send (or call your hook for) signup confirmation. In **Supabase Dashboard** go to **Authentication → Providers → Email** and enable **"Confirm email"**. Save. After that, new signups will trigger the Send Email hook with `email_action_type: "signup"` and your Resend email will be sent. (Forgot-password can work even when Confirm email is off, because that flow always sends an email.)

### 1.1 Env and Resend

- **Netlify (or your host):** `RESEND_API_KEY` and `SEND_EMAIL_HOOK_SECRET` must be set. Redeploy after changing.
- **Resend:** [resend.com](https://resend.com) → **Domains**. The “from” address is `Teevo <hello@teevohq.com>` in code – that domain (e.g. `teevohq.com`) must be **verified** in Resend or emails will fail.

### 1.2 Supabase Send Email hook

- **Dashboard:** Auth → **Hooks** → **Send Email**.
- Hook type must be **HTTP**.
- **URL** must be your live app, e.g. `https://app.teevohq.com/api/auth/send-email` (not localhost unless you use a tunnel).
- **Secret:** copy the value and set it as `SEND_EMAIL_HOOK_SECRET` in Netlify (full string including `v1,whsec_...`).

If the hook fails, Supabase may retry; check Supabase docs for hook logs or “failed hook” indicators.

### 1.3 Server logs (Netlify / host)

When the hook is called you should see:

- **Success:** `Send email hook: sent signup to user@example.com` (or `recovery`).
- **Failure:** `Send email hook: verification failed` (wrong secret or body) or `Send email hook: signup email failed` (Resend error).

Where to look:

- **Netlify:** Site → **Functions** (or **Logs**) → filter by `/api/auth/send-email` or search for “Send email hook”.
- **Local:** `npm run dev` and watch the terminal when you trigger signup or forgot password.

### 1.4 Quick tests

- **Signup:** Create a new account with an email you control. Check inbox and spam; check Netlify logs for the hook request.
- **Forgot password:** Use “Forgot password?” on login; same checks.

If the hook is never called, Supabase isn’t sending to your URL (wrong URL, hook disabled, or project config). If the hook is called but you see “verification failed”, fix `SEND_EMAIL_HOOK_SECRET`. If you see “signup email failed” and a message from Resend, fix API key or domain in Resend.

---

## 2. Transactional emails (orders, shipping, etc.)

These are sent from:

- Stripe webhook: `app/api/webhooks/stripe/route.ts` (order confirmation, item sold, payment received).
- Shipped: `app/api/transactions/[id]/shipped/route.ts`.
- Confirm receipt: `app/api/transactions/[id]/confirm-receipt/route.ts`.

All use `sendEmail()` in `lib/email.ts` (Resend).

### 2.1 Env and Resend

- `RESEND_API_KEY` must be set where these APIs run (e.g. Netlify).
- Same **domain verification** in Resend as above (`hello@teevohq.com` / teevohq.com).

### 2.2 Resend dashboard

- **Resend → Emails:** See every send and its status (delivered, bounced, etc.). If nothing appears for a given action, the code path that calls `sendEmail()` wasn’t hit or threw before sending.
- **Resend → Logs:** More detail on errors (e.g. invalid from/domain, rate limits).

### 2.3 Your app logs

- **Netlify:** Check logs for the routes above (e.g. `/api/webhooks/stripe`, `/api/transactions/.../shipped`). Any uncaught error from `sendEmail()` will show there.
- **Idempotency:** Transactional sends are guarded by `sent_emails` in `lib/email-triggers.ts` (same type + reference only sent once). If the row already exists, the email is skipped (no Resend call and no log there).

### 2.4 Quick test

Run a full purchase (or use Stripe test mode), then:

- Check Resend → Emails for “Order confirmation”, “Item sold”, etc.
- If those entries exist but mail doesn’t land, it’s delivery (spam, domain reputation, recipient server). If those entries don’t exist, the webhook or API didn’t call `sendEmail()` (check logs and `sent_emails` table).

---

## 3. Common causes

| Symptom | What to check |
|--------|----------------|
| No auth emails at all | Hook URL correct? Hook enabled? `SEND_EMAIL_HOOK_SECRET` set and matching dashboard? |
| Hook returns 401 | Signature verification failed → wrong `SEND_EMAIL_HOOK_SECRET` or Supabase not sending the expected body/headers. |
| Hook returns 500 | See Netlify log for “signup email failed” / “recovery email failed” → usually Resend (API key, domain, or error message in log). |
| Resend “domain not verified” | Add and verify the sending domain in Resend (e.g. teevohq.com) for `hello@teevohq.com`. |
| No transactional emails | Stripe webhook URL and events correct? `RESEND_API_KEY` set? Check Resend dashboard and Netlify logs for those routes. |
| Emails in spam | Verify domain (SPF/DKIM) in Resend and warm up the domain. |

---

## 4. Local testing (auth hook)

Supabase must reach your app. Options:

- **Tunnel:** e.g. `ngrok http 3000` and set the hook URL to the ngrok URL (e.g. `https://xxx.ngrok.io/api/auth/send-email`). Use the same secret in `.env.local`.
- Or test auth emails only on the deployed site where the hook URL already points.

Logs from the hook (success or failure) will appear in the terminal where `npm run dev` is running.
