# Teevo MVP – UK Golf Equipment Marketplace

Liquidity-first MVP for a UK-based golf equipment marketplace. Sellers list items (manual verification), buyers purchase via Stripe Checkout; payments go to sellers via Stripe Connect Express.

## Stack

- **Frontend:** Next.js 14, Tailwind CSS, mobile-first
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Stripe Connect Express (sellers), Stripe Checkout (buyers), webhooks

## Setup

1. **Clone and install**
   ```bash
   cd teevo-mvp && npm install
   ```

2. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - Run the SQL in `docs/DATABASE_SCHEMA.sql` in the SQL Editor.
   - Create a storage bucket named `listings` and set it to **public** (or add a policy to allow public read for listing images).
   - In Authentication → Providers, enable Email (email-only for MVP).
   - For **Forgot password** to work, the reset email must use a token-hash link. See **`docs/PASSWORD_RESET_SUPABASE.md`** for step-by-step setup (SMTP so the dashboard template is used, URL config, template body, and testing). If the link in the email is still `supabase.co/auth/v1/verify`, the template is not in use—follow that doc.
   - Copy project URL and anon key; create a service role key for server-side admin and webhooks.

3. **Stripe**
   - Create a Stripe account; get Secret key and Publishable key.
   - Connect: create Express accounts (GB), use Checkout with `transfer_data.destination`.
   - Webhooks: add endpoint `https://your-domain.com/api/webhooks/stripe` and subscribe to `checkout.session.completed`, `charge.refunded`. Use the signing secret in env.

4. **Environment**
   - Copy `.env.example` to `.env.local` and fill in all values.

5. **First admin user**
   - Sign up normally, then in Supabase SQL Editor run:
     ```sql
     UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
     ```

6. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Docs

- **`docs/SETUP_SUPABASE_STRIPE.md`** – **Detailed Supabase & Stripe setup** (start here for env and config)
- `docs/ARCHITECTURE.md` – System architecture
- `docs/API_ROUTES.md` – API route plan
- `docs/DATABASE_SCHEMA.sql` – PostgreSQL schema
- `docs/STRIPE_FLOW.md` – Stripe Connect & Checkout flow
- `docs/COMPONENT_STRUCTURE.md` – Frontend structure
- `docs/TASKS.md` – Development task breakdown

## Brand colours

- **Mowing Green** `#265C4B` – primary
- **Par-3 Punch** `#49C184` – secondary
- **Golden Tee** `#FFD25E` – accent
- **Off-White Pique** `#FDFCF5` – background
- **Divot Pink** `#FF8A8A` – pop

## Deploy (Vercel)

- Connect repo; set all env vars.
- Stripe webhook URL: `https://your-vercel-url.vercel.app/api/webhooks/stripe`.
