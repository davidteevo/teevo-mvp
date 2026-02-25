# Teevo MVP – Supabase & Stripe setup (detailed)

Step-by-step setup for Supabase (database, auth, storage) and Stripe (Connect + Checkout + webhooks).

---

## Part 1: Supabase

### 1.1 Create a project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Choose your **organization** (or create one).
4. Set **Project name** (e.g. `teevo-mvp`).
5. Set a **Database password** and store it somewhere safe (you need it for direct DB access; the app uses API keys).
6. Pick a **Region** (e.g. London `eu-west-1` for UK).
7. Click **Create new project** and wait for it to finish provisioning.

---

### 1.2 Run the database schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Open the file `teevo-mvp/docs/DATABASE_SCHEMA.sql` in your editor and copy its full contents.
3. Paste into the SQL Editor and click **Run** (or press Cmd/Ctrl+Enter).
4. Confirm there are no errors. This creates:
   - `public.users` (id, email, role, stripe_account_id, timestamps)
   - `public.listings` (with category, brand, model, condition, price, status, etc.)
   - `public.listing_images` (listing_id, sort_order, storage_path)
   - `public.transactions`
   - `public.admin_actions`
   - Indexes and RLS policies
   - A trigger that sets a listing to `sold` when a transaction is inserted

**If you get an error about `auth.users`:**  
The schema references `auth.users(id)`. In Supabase this table already exists. If the `users` table creation fails, check that the reference is correct (it should be `REFERENCES auth.users(id) ON DELETE CASCADE`).

**If you get an error about `condition`:**  
The column is quoted as `"condition"` in the schema because it’s a reserved word. If you edited the SQL and removed the quotes, add them back.

---

### 1.3 Create the storage bucket for listing images

1. In the dashboard go to **Storage**.
2. Click **New bucket**.
3. **Name:** `listings` (must match what the app uses).
4. **Public bucket:** turn **ON** so listing images can be viewed without auth.
5. Click **Create bucket**.

**Optional – restrict who can upload:**  
By default, the app uses the **service role** key to upload (server-side), so uploads are not tied to storage policies. If you want to lock down uploads via RLS-style policies later, you can add a policy that allows authenticated users to upload only to paths that match their `user_id`, but for the MVP the service-role upload in the API is enough.

**Profile photos (avatars):**  
Create a second bucket for user profile pictures: **Storage** → **New bucket** → **Name:** `avatars` → **Public bucket:** ON → **Create bucket**. The app stores avatar paths in `public.users.avatar_path`.

---

### 1.4 Configure Authentication

1. Go to **Authentication** → **Providers**.
2. **Email:**  
   - Ensure **Email** is **Enabled**.  
   - Optionally disable “Confirm email” for faster local testing (re-enable for production).
3. **Google (skip for MVP):**  
   The app uses email-only auth for the MVP. You can leave the Google provider disabled. To add Google later, enable it in Supabase and create OAuth 2.0 credentials in Google Cloud Console with redirect URI `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`.

**Redirect URLs:**  
Under **Authentication** → **URL Configuration**, set:

- **Site URL:** your app URL (e.g. `http://localhost:3000` for dev, or `https://your-domain.com` for prod).
- **Redirect URLs:** add:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`
  - And your production URL + `/auth/callback` and `https://your-domain.com/**` when you deploy.

This lets Supabase redirect back to your app after login/signup.

---

### 1.5 Get Supabase keys and add to `.env.local`

1. Go to **Project Settings** (gear icon) → **API**.
2. You’ll see:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)  
   - **anon public** key (safe to use in the browser)  
   - **service_role** key (secret; never expose in the frontend)
3. In `teevo-mvp` create `.env.local` (if it doesn’t exist) and set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your real Project URL, anon key, and service_role key. The app uses:

- **NEXT_PUBLIC_*** for the browser (auth, public reads).
- **SUPABASE_SERVICE_ROLE_KEY** only in API routes (creating listings, admin, webhooks, uploading images).

---

### 1.6 Create your first admin user (after first sign-up)

The app does not have a “become admin” UI. You promote a user in the database:

1. Sign up once in your app (e.g. with your email) so a row is created in `public.users`.
2. In Supabase go to **SQL Editor** and run (use your email):

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'your@email.com';
```

3. Sign out and back in (or refresh); your session’s profile will now have `role: 'admin'` and the **Admin** link will appear in the header.

---

## Part 2: Stripe

### 2.1 Create a Stripe account and get keys

1. Go to [stripe.com](https://stripe.com) and sign in or create an account.
2. Complete any onboarding (you can skip “run a payment” for now).
3. Open **Developers** → **API keys**.
4. You’ll see:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
5. For development use **Test mode** (toggle in the top right). Use **Live** only when you’re ready to accept real money.

Add to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

The app uses the secret key in API routes only; the publishable key is for any future client-side Stripe.js usage (e.g. custom card UI). Right now checkout is entirely server-driven (redirect to Stripe Checkout).

---

### 2.2 Enable Stripe Connect (for sellers)

1. In the Stripe Dashboard go to **Connect** → **Settings** (or **Get started** with Connect).
2. Ensure **Connect** is enabled for your account.
3. Under **Platform settings** (or similar):
   - **Branding:** optional; set your platform name (e.g. “Teevo”) and icon for the Express onboarding flow.
   - **Express accounts** are what the app uses; no need to enable “Standard” or “Custom” unless you change the code.

The app creates **Express** connected accounts (country **GB**) and generates Account Links so sellers complete Stripe’s hosted onboarding. No extra dashboard “product” needs to be created for Connect; the code does `stripe.accounts.create({ type: 'express', country: 'GB' })` and `stripe.accountLinks.create(...)`.

---

### 2.3 Checkout (buyers) and destination charges

Buyers pay with **Stripe Checkout**. The app creates a Checkout Session with:

- `mode: 'payment'`
- `payment_intent_data.transfer_data.destination` set to the seller’s Connect account ID

So funds go **directly to the seller’s connected account** (destination charge). The platform does not hold funds; no separate “application fee” is set in the MVP.

No product or price needs to be created in the Stripe Dashboard for this; the API creates **price_data** on the fly from the listing’s price (in pence, GBP).

---

### 2.4 Webhooks (required for completing a purchase)

When a buyer completes payment, Stripe sends a **checkout.session.completed** event. The app uses it to create the `transactions` row and mark the listing as sold. Without the webhook, purchases would not be recorded.

**Local development (Stripe CLI):**

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Log in: `stripe login`.
3. Forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. The CLI will print a **webhook signing secret** (e.g. `whsec_...`). Use this **only** in `.env.local` for local testing:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. Start your app (`npm run dev`) and run a test payment; the CLI will show incoming events and your app will create the transaction.

**Production (Vercel or your host):**

1. In Stripe go to **Developers** → **Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe` (must be HTTPS).
4. **Events to send:** select:
   - `checkout.session.completed`
   - `charge.dispute.created`
   - `charge.refunded`
   - `refund.updated`
5. Click **Add endpoint**. Stripe will show a **Signing secret** (starts with `whsec_`).
6. In your production environment (e.g. Vercel env vars), set:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Use the **production** webhook signing secret for the live endpoint; do not reuse the CLI’s secret for production.

---

### 2.5 Optional: test cards and Connect onboarding

- **Test cards:** [Stripe test cards](https://docs.stripe.com/testing#cards) (e.g. `4242 4242 4242 4242` for success). Use any future expiry and any CVC; use a valid UK postcode if prompted.
- **Connect Express onboarding:** In test mode, when a seller clicks “Connect Stripe” and is sent to Stripe, they can use test data (e.g. fake name, address, bank details) to complete onboarding without a real bank.

---

### 2.6 Summary of Stripe-related env vars

In `.env.local` (and in production env):

```env
# Required for API routes (create Connect accounts, Checkout sessions, verify webhooks)
STRIPE_SECRET_KEY=sk_test_...

# Optional for future client-side Stripe.js
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Required for webhook signature verification (use CLI secret locally, dashboard secret in prod)
STRIPE_WEBHOOK_SECRET=whsec_...
```

Add your app URL for redirects (Stripe Connect return/refresh and Checkout success/cancel):

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

In production set `NEXT_PUBLIC_APP_URL` to your real domain (e.g. `https://teevo.co.uk`).

---

## Part 3: Quick checklist

**Supabase**

- [ ] Project created and schema run (`docs/DATABASE_SCHEMA.sql`)
- [ ] Storage bucket `listings` created and set to **Public**
- [ ] Email auth enabled (email-only for MVP)
- [ ] Redirect URLs include `.../auth/callback` and `.../**` for your app URL
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] First user created in the app, then promoted to admin via SQL

**Stripe**

- [ ] Test (or live) API keys in `.env.local`: `STRIPE_SECRET_KEY`, optionally `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Connect enabled; Express accounts used in code (no extra dashboard setup)
- [ ] Webhook endpoint added: local via `stripe listen`, production via Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` set (CLI secret locally, endpoint secret in prod)
- [ ] `NEXT_PUBLIC_APP_URL` set for your app (used in return/refresh and Checkout URLs)

After this, run `npm run dev`, sign up, promote yourself to admin, and test: create a listing, approve it as admin, connect Stripe as seller, then buy with a test card and confirm the webhook creates the transaction.
