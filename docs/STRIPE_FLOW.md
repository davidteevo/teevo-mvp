# Teevo MVP – Stripe Integration Flow

## Overview

- **Sellers:** Stripe Connect Express accounts. Sellers receive payouts directly; platform does not hold funds.
- **Buyers:** Stripe Checkout one-time payment. Funds go to connected seller account (after platform fee if any; MVP = free so 0% fee).

## 1. Seller onboarding (Stripe Connect Express)

```
1. Seller clicks "Set up payouts" (or similar) in dashboard.
2. App calls POST /api/onboarding/stripe-connect with return_url, refresh_url.
3. API creates Stripe Account (type: express) and AccountLink:
   - Stripe.Account.create({ type: 'express', country: 'GB' })
   - Stripe.AccountLink.create({ account, return_url, refresh_url, type: 'account_onboarding' })
4. API saves stripe_account_id to users table (when account is created; link is one-time).
5. Redirect seller to AccountLink.url.
6. Seller completes Stripe onboarding on Stripe-hosted page.
7. Seller is redirected to return_url; app calls Stripe.Account.retrieve(account_id) to confirm details_submitted.
8. Optionally refresh_url is used if link expires; create new AccountLink and redirect again.
```

**Webhook (optional for onboarding):** `account.updated` – can sync charges_enabled / payouts_enabled to your DB.

## 2. Buyer checkout (Stripe Checkout)

```
1. Buyer clicks "Buy" on a verified listing.
2. App calls POST /api/checkout with listing_id.
3. API:
   - Loads listing and seller (must have stripe_account_id).
   - Creates Stripe Checkout Session:
     - mode: 'payment'
     - payment_intent_data: { application_fee_amount: 0 }  // MVP free
     - line_items: [ { price_data: { currency: 'gbp', unit_amount: listing.price }, quantity: 1 } ]
     - payment_intent_data.transfer_data.destination = seller.stripe_account_id
   - Stores in DB: transaction (status: pending, stripe_payment_id when available).
4. Return session.url to client; redirect buyer to Stripe Checkout.
5. Buyer pays on Stripe; redirected to success_url (e.g. /purchase/success?session_id=...).
6. Webhook payment_intent.succeeded (or checkout.session.completed):
   - Create or update transaction (stripe_payment_id, status pending).
   - Set listing to sold (or already via DB trigger).
   - Notify seller (email or in-app).
```

**Important:** For Connect with destination charge, create PaymentIntent with `transfer_data.destination = stripe_account_id` and use Stripe Checkout with that PaymentIntent, or use Checkout Session with `payment_intent_data.transfer_data.destination`. For Express accounts, prefer Checkout Session with `transfer_data.destination` so funds go to connected account.

## 3. Payout to seller (release after ship + confirm or 3-day auto)

**Option A – Manual transfer (simplest for MVP)**  
- When buyer confirms receipt (or 3 days after “shipped” with no dispute), your backend creates a **Transfer** to the Connect account using the PaymentIntent’s charge.  
- Stripe docs: “Captured funds are automatically transferred to the connected account when using destination charges.” So for **destination charges**, transfer is automatic; you don’t create a separate Transfer.  
- For **separate charges and transfers**: create PaymentIntent without destination, then create Transfer after release.  
- **MVP recommendation:** Use **destination charge** so funds go to seller’s Connect account on capture; release = no refund. So “release” = just updating transaction status and optionally notifying; no extra Transfer call.

**Option B – Refund if dispute**  
- If buyer disputes before release: issue Refund via Stripe; update transaction to refunded.

**Flow summary:**

```
Seller marks "Shipped" → status = shipped, shipped_at = now.
Buyer clicks "I received it" → status = complete, completed_at = now.
  (Funds already with seller via destination charge; no extra API call.)
OR auto-release 3 days after shipped_at (cron or edge) → status = complete.
```

## 4. Webhooks

**Endpoint:** `POST /api/webhooks/stripe`  
**Signing secret:** Stripe webhook signing secret (e.g. whsec_...).

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update transaction; set listing sold; notify seller |
| `payment_intent.succeeded` | Ensure transaction record has stripe_payment_id |
| `charge.refunded` | Set transaction status = refunded; optionally relist item |
| `account.updated` | (Optional) Sync seller account capabilities |

Verify signature with `stripe.webhooks.constructEvent(payload, sig, secret)` and return 200 quickly; do heavy work async if needed.

## 5. Environment variables

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

## 6. UK only

- Create Connect accounts with `country: 'GB'`.
- Checkout currency: `gbp`.
- No international expansion in MVP.
