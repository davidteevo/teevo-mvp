# Teevo MVP – API Route Plan

All routes under `/api` (Next.js API routes or Route Handlers).

## Auth (delegate to Supabase client where possible)

| Method | Path | Description |
|--------|------|-------------|
| - | Client-side | Sign up / sign in via Supabase Auth; session in cookie or client state |

## Users & onboarding

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Current user profile + role + stripe_account_id |
| POST | `/api/onboarding/stripe-connect` | Create Stripe Express account link; return `url` for redirect |
| GET | `/api/onboarding/stripe-connect/return` | Handle return from Stripe; save account id to user |

## Listings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/listings` | List verified listings; query: category, brand, minPrice, maxPrice |
| GET | `/api/listings/[id]` | Single listing by id (public if verified) |
| POST | `/api/listings` | Create listing (seller); body: category, brand, model, condition, description, price; images via upload |
| PATCH | `/api/listings/[id]` | Update own listing (seller); only if status pending |
| POST | `/api/listings/[id]/images` | Upload 3–6 images for listing (Supabase Storage) |

## Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/listings/pending` | List pending listings (admin only) |
| POST | `/api/admin/listings/[id]/approve` | Set status = verified (admin) |
| POST | `/api/admin/listings/[id]/reject` | Set status = rejected (admin) |
| POST | `/api/admin/listings/[id]/flag` | Flag suspicious (admin) |
| GET | `/api/admin/transactions` | List transactions; query: status |
| POST | `/api/admin/transactions/[id]/intervene` | Manual intervention note / refund (admin) |

## Checkout & transactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/checkout` | Create Stripe Checkout session for listing_id; return session URL |
| GET | `/api/transactions` | List transactions for current user (buyer or seller) |
| GET | `/api/transactions/[id]` | Single transaction detail |
| POST | `/api/transactions/[id]/shipped` | Seller marks as shipped |
| POST | `/api/transactions/[id]/confirm-receipt` | Buyer confirms receipt (triggers release) |

## Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks/stripe` | Stripe webhook: payment_intent.succeeded, transfer.created, charge.refunded, etc. |

## Analytics (optional for MVP)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/events` | Track event (e.g. listing_created, listing_approved, purchase); PostHog or internal |
