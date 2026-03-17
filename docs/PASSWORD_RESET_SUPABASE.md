# Password reset (Forgot password) – Supabase setup

The app needs the reset email to contain a link like:

`http://localhost:3000/api/auth/set-password?token_hash=...`

If the link in the email is instead **`https://...supabase.co/auth/v1/verify?token=...`**, the dashboard template is not in use. Follow the steps below so Supabase sends your custom template.

---

## 1. Use custom SMTP (so the dashboard template is used)

If you use the **Resend Integration** (one-click connect), Supabase often sends a fixed template and **ignores** the Email Templates you edit. You must send auth emails via **custom SMTP** instead.

1. In Supabase: **Authentication** → **SMTP Settings** (or **Emails** → **Custom SMTP**).
2. **Enable** custom SMTP.
3. Fill in Resend’s SMTP details:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **User:** `resend`
   - **Password:** your **Resend API key** (from [resend.com](https://resend.com) → **API Keys** → create/copy)
   - **Sender email:** a verified address (e.g. `noreply@yourdomain.com`)
4. **Save**.

If you had a Resend **Integration** connected, **disconnect** it (Authentication → Integrations or Emails) so auth emails go through SMTP only.

---

## 2. URL Configuration

1. **Authentication** → **URL Configuration**.
2. **Site URL:** set to your app origin, e.g. `http://localhost:3000` (or your production URL).
3. **Redirect URLs:** ensure the list includes:
   - `http://localhost:3000/login/reset-password`
   - `http://localhost:3000/api/auth/set-password`
   - (and your production URLs if applicable).

---

## 3. Reset Password email template

1. **Authentication** → **Email Templates** → **Reset password**.
2. In the **Body** (Source), the reset link line must be **exactly** this (one line, no extra `<a>` tags):

   ```html
   <a href="{{ .SiteURL }}/api/auth/set-password?token_hash={{ .TokenHash }}">Reset Password</a>
   ```

3. Do **not** use `{{ .ConfirmationURL }}` (that produces the default supabase.co link).
4. **Save**.

---

## 4. Test

1. In the app, use **Forgot password** and submit your email.
2. Open the **new** email (not an old one).
3. Right‑click the “Reset Password” link → **Copy link**.
4. The URL should start with your app (e.g. `http://localhost:3000`) and contain **`token_hash=`**. If it still starts with `https://...supabase.co/auth/v1/verify`, the template is still not in use—double‑check Integration is off and SMTP is enabled and saved.
5. Click the link; you should see the “Set new password” form and be able to complete the flow.

---

## If the link is still supabase.co

- **Temporarily use Supabase built-in email:** In SMTP Settings, **disable** custom SMTP. Request a new reset email. If the new link then has `token_hash=` and your app URL, the template is correct and the issue is with custom SMTP or the Integration. Re-enable SMTP and ensure the Integration is disconnected.
- **Same project:** Confirm you’re editing the same Supabase project that your app uses (check project URL in `.env` / `NEXT_PUBLIC_SUPABASE_URL`).
