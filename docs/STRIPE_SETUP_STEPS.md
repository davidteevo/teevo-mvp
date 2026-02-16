# Stripe setup: migration + webhooks

## Hosting on your domain (not localhost)

To run the app on your live domain (e.g. `https://app.teevohq.com`):

1. **App URL** – Set `NEXT_PUBLIC_APP_URL` to your domain (no trailing slash), e.g. `https://app.teevohq.com`.  
   In this project it’s in `.env.local` for local runs and in **Netlify (or your host) → Site settings → Environment variables** for production.

2. **Stripe webhook for the domain** – In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:
   - **Endpoint URL:** `https://app.teevohq.com/api/webhooks/stripe` (use your real domain).
   - **Events:** `checkout.session.completed`, `charge.dispute.created`, `charge.refunded`, `refund.updated`.
   - Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` in your **host’s** environment variables (e.g. Netlify). You no longer need `stripe listen` for production.

3. **Supabase** – In [Supabase → Authentication → URL configuration](https://supabase.com/dashboard), add your domain to **Redirect URLs**, e.g. `https://app.teevohq.com/auth/callback` and `https://app.teevohq.com/**`.

4. **Deploy** – Push to your connected Git repo so Netlify (or your host) builds and deploys. The site will be served from your domain and Stripe redirects will go back there after payment.

## Step 1: Run the database migration (Supabase)

Only needed if you created your `transactions` table **before** we added the Stripe checkout/create and order-state columns. If you get errors like "column order_state does not exist" when a purchase completes, run this.

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
2. In the left sidebar click **SQL Editor**.
3. Click **New query**.
4. Copy and paste the contents of **`docs/MIGRATION_transactions_stripe_columns.sql`** (or the block below).
5. Click **Run** (or press Cmd/Ctrl + Enter).
6. You should see "Success. No rows returned." or similar. That means the columns were added.

**SQL to run (copy this if you prefer):**

```sql
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_postcode TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shipping_option TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_state TEXT NOT NULL DEFAULT 'paid' CHECK (order_state IN ('paid', 'label_created', 'shipped', 'delivered', 'completed'));
```

---

## Step 2: Configure Stripe webhooks (Dashboard)

So Stripe can notify your app when a payment succeeds, is refunded, or disputed.

1. Go to **[Stripe Dashboard](https://dashboard.stripe.com)** and sign in.
2. Turn **Test mode** on (top right) if you're testing; use **Live** for production.
3. Open **Developers** → **Webhooks** (in the top nav or left menu).
4. Click **Add endpoint** (or **Add an endpoint**).
5. **Endpoint URL:**  
   - Local: use the URL from Stripe CLI (see "Local development" below).  
   - Production: `https://your-domain.com/api/webhooks/stripe`  
   (e.g. `https://teevo.co.uk/api/webhooks/stripe` or your Netlify/Vercel URL.)
6. Under **Select events to listen to**, click **Select events** and choose:
   - `checkout.session.completed`
   - `charge.dispute.created`
   - `charge.refunded`
   - `refund.updated`
7. Click **Add endpoint**.
8. On the new endpoint’s page, open **Signing secret** and click **Reveal**. Copy the value (starts with `whsec_`).
9. Put that in your environment:
   - **Local:** in `.env.local`:  
     `STRIPE_WEBHOOK_SECRET=whsec_...`
   - **Production:** in your host’s env vars (e.g. Vercel/Netlify):  
     `STRIPE_WEBHOOK_SECRET=whsec_...`

**Local development:** Stripe can’t reach `localhost`, so use the CLI:

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Run: `stripe login`
3. Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`  
   (change the port if your app uses another.)
4. The CLI will print a **webhook signing secret** (e.g. `whsec_...`). Use that in `.env.local` as `STRIPE_WEBHOOK_SECRET`.
5. Keep the CLI running while testing payments; it forwards Stripe events to your app.
