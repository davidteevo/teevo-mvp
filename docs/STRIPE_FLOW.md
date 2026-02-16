# Teevo MVP – Stripe Integration Flow

## Overview

- **Sellers:** Stripe Connect Express accounts. Sellers receive the **item price** via destination charge; platform keeps **authenticity fee (8% + £0.50)** and **shipping** as application fee.
- **Buyers:** Stripe Checkout one-time payment. Total = item + authenticity & protection + shipping (tracked £9.49). Funds: item → seller; authenticity + shipping → platform.

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

**Route:** `POST /api/checkout/create` (or `POST /api/checkout` for backward compatibility).

**Inputs:** `listingId` (required), `buyerPostcode` (optional), `shippingOption` (optional, default `"tracked"`).

**Output:** `{ url }` – Stripe Checkout Session URL (redirect buyer here).

```
1. Buyer clicks "Buy" on a verified listing.
2. App calls POST /api/checkout/create with { listingId, buyerPostcode?, shippingOption? }.
3. API (lib/stripe-checkout.ts):
   - Loads listing and seller (must have stripe_account_id).
   - Computes total: item + authenticity (8% + £0.50) + shipping (£9.49).
   - Creates Stripe Checkout Session:
     - mode: 'payment'
     - payment_intent_data.transfer_data.destination = seller.stripe_account_id
     - payment_intent_data.application_fee_amount = authenticity + shipping (platform keeps this)
     - line_items: [ Item, Authenticity & Protection, Shipping (Tracked) ]
     - metadata: listingId, buyerId, sellerId, buyerPostcode?, shippingOption?
4. Return session.url; redirect buyer to Stripe Checkout.
5. Buyer pays; redirected to success_url.
6. Webhook checkout.session.completed:
   - Insert transaction (status: pending, order_state: paid, buyer_postcode, shipping_option, stripe_checkout_session_id).
   - Set listing to sold (trigger or webhook).
```

**Important:** Destination charge: item goes to seller; application_fee_amount (authenticity + shipping) stays with platform.

## 3. Order state and payout

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
**Signing secret:** `STRIPE_WEBHOOK_SECRET` (e.g. whsec_...).

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Insert transaction (listingId, buyerId, sellerId, amount, stripe_payment_id, stripe_checkout_session_id, order_state=paid, buyer_postcode, shipping_option); set listing sold |
| `charge.dispute.created` | Set transaction status = dispute |
| `charge.refunded` | Set transaction status = refunded |
| `refund.updated` | If refund.status === succeeded, set transaction status = refunded (by charge → payment_intent lookup) |
| `account.updated` | (Optional) Sync seller account capabilities |

**Production:** In Stripe Dashboard → Developers → Webhooks, add endpoint and subscribe to: `checkout.session.completed`, `charge.dispute.created`, `charge.refunded`, `refund.updated`.

Verify signature with `stripe.webhooks.constructEvent(body, sig, secret)` and return 200 quickly; do heavy work async if needed.

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
