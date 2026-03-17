# Send Email Hook – Password reset checklist

Use this to confirm `app/api/auth/send-email/route.ts` is set up so **Reset password** emails contain your app link (not the Supabase verify URL).

**If you see "Invalid or expired link" after clicking the reset link:** The email was almost certainly sent by Supabase’s default path (not this hook). Enable the Send Email hook (Step 3) and request a **new** reset email.

---

## Step 1: Recovery uses your app link

1. Open **`app/api/auth/send-email/route.ts`**.
2. Find the **`recovery`** branch (search for `email_action_type === "recovery"`).
3. Confirm the **`cta_link`** is **`buildRecoveryLink()`**, not `buildVerifyUrl(...)`.

**Correct:**

```ts
} else if (email_action_type === "recovery") {
  try {
    await sendViaResend(
      email,
      "Reset your Teevo password",
      {
        title: "Reset your password",
        subtitle: "You requested a password reset",
        body: `Hi ${firstName}, ...`,
        cta_link: buildRecoveryLink(),   // ← must be this
        cta_text: "Reset password",
      }
    );
```

**Wrong:** `cta_link: buildVerifyUrl(token_hash, email_action_type)` (that produces the supabase.co link).

---

## Step 2: `buildRecoveryLink` exists and uses `token_hash`

1. In the same file, find where **`buildRecoveryLink`** is defined (near `buildVerifyUrl`).
2. Confirm it looks like this:

```ts
/** For recovery, use app set-password URL so we can verify token_hash server-side (no PKCE). */
const buildRecoveryLink = () =>
  `${appOrigin}/api/auth/set-password?token_hash=${encodeURIComponent(token_hash)}`;
```

3. Confirm **`appOrigin`** is defined just above it, using `site_url` (and fallback to `redirect_to`):

```ts
const { token_hash, redirect_to, email_action_type, token_new, token_hash_new, site_url } = email_data;
const appOrigin =
  (site_url ?? "").replace(/\/$/, "") ||
  (typeof redirect_to === "string" && /^https?:\/\//.test(redirect_to) ? new URL(redirect_to).origin : "");
```

If `appOrigin` is empty, the link would be like `/api/auth/set-password?token_hash=...` (relative); Supabase should send `site_url` (e.g. `http://localhost:3000` or your production URL) so this is set.

---

## Step 3: Supabase is calling this hook

1. In **Supabase Dashboard** → **Authentication** → **Hooks** (or **Auth Hooks**).
2. Find **Send Email** (or similar).
3. Confirm the **HTTP endpoint** is your app’s send-email URL, e.g.:
   - Local: `http://localhost:3000/api/auth/send-email` (only works if Supabase can reach it; use a tunnel for local testing if needed).
   - Production: `https://your-domain.com/api/auth/send-email`.
4. Confirm the **secret** matches what you have in env as **`SEND_EMAIL_HOOK_SECRET`** (format `v1,whsec_...`).

If the hook is disabled or points elsewhere, Supabase will send emails itself and you’ll get the default supabase.co link.

---

## Step 4: Env vars where the app runs

Where the app runs (local or production), confirm:

- **`RESEND_API_KEY`** – so the route can send via Resend.
- **`SEND_EMAIL_HOOK_SECRET`** – same value as in Supabase for the Send Email hook.

---

## Step 5: Restart / redeploy after changes

After any change to `app/api/auth/send-email/route.ts`:

- **Local:** Restart the dev server.
- **Production:** Redeploy so the new code is live.

Then request a **new** “Forgot password” email. The “Reset password” link in that email should be:

- **Correct:** `http://localhost:3000/api/auth/set-password?token_hash=...` (or your production origin).
- **Wrong:** `https://...supabase.co/auth/v1/verify?token=...`.

---

## Quick reference

| Check | Location in file | What to confirm |
|------|------------------|------------------|
| Recovery CTA | `email_action_type === "recovery"` block | `cta_link: buildRecoveryLink()` |
| buildRecoveryLink | Near `buildVerifyUrl` | Returns `{appOrigin}/api/auth/set-password?token_hash={token_hash}` |
| appOrigin | Same area | From `email_data.site_url` (and `redirect_to` fallback) |
| Hook URL | Supabase Dashboard → Auth → Hooks | Points to your `/api/auth/send-email` |
| Env | `.env.local` / production env | `RESEND_API_KEY`, `SEND_EMAIL_HOOK_SECRET` |
| After edits | — | Restart dev server or redeploy, then request new reset email |
