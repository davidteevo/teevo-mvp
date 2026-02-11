# Teevo MVP – System Architecture

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Mobile-First Web)                            │
│  Next.js App (React) · Tailwind CSS · Vercel                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Pages: / (browse) · /listing/[id] · /sell · /dashboard · /admin · /auth         │
│  Trust: Verified badge · Secure Payment · UK Only                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS / API Routes
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS API ROUTES (Node.js)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Auth (Supabase)  │  Listings CRUD  │  Stripe Connect  │  Stripe Checkout       │
│  Webhooks         │  Admin actions  │  Transactions    │  File upload (Supabase) │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
┌──────────────────┐  ┌─────────────────────────────────────┐  ┌──────────────────┐
│   Supabase       │  │   Supabase PostgreSQL               │  │   Stripe         │
│   Auth           │  │   · users (profiles + stripe_id)    │  │   · Connect      │
│   (optional)     │  │   · listings                       │  │   · Checkout     │
│   + Storage      │  │   · listing_images                 │  │   · Webhooks     │
│   (images)       │  │   · transactions                   │  │   · Transfers     │
└──────────────────┘  └─────────────────────────────────────┘  └──────────────────┘
```

## Data Flow Summary

| Flow | Path |
|------|------|
| **Seller onboarding** | App → API → Stripe Connect Express → callback → save `stripe_account_id` on user |
| **Create listing** | App → API → DB (status: pending) + Storage (images) |
| **Verify listing** | Admin → API → DB (status: verified/rejected) |
| **Purchase** | Buyer → Stripe Checkout → Webhook → DB (transaction) → notify seller |
| **Payout** | Seller marks shipped → Buyer confirms (or 3-day auto) → Webhook → Stripe transfer to seller |

## Security

- **Auth:** Supabase Auth (JWT). Role stored in `users.role`.
- **Admin:** API checks `users.role === 'admin'` for admin routes.
- **Stripe:** Platform never holds funds; Connect Express for seller payouts; Checkout for buyer payment.
- **RLS:** Supabase RLS can restrict listings to `status = 'verified'` for public read; admin bypass.

## Hosting

- **Frontend + API:** Vercel (Next.js).
- **DB + Auth + Storage:** Supabase.
- **Payments:** Stripe (Connect + Checkout + Webhooks).
