# Shippo shipping integration

Teevo uses [Shippo](https://goshippo.com) to create shipping labels for sales. Sellers can create a label from the **Sales** tab; the label opens in a new tab and they can mark the order as shipped.

## Setup

1. **Shippo account**  
   Sign up at [goshippo.com](https://goshippo.com) and get an API token (use the test token while developing).

2. **Environment**  
   Add to `.env.local`:
   ```bash
   SHIPPO_API_TOKEN=shippo_test_...
   ```

3. **Database**  
   Run the migrations in Supabase SQL Editor:
   - `docs/MIGRATION_transactions_shippo.sql` – buyer address, Shippo label fields, shipping service.
   - `docs/MIGRATION_listings_parcel_preset.sql` – parcel preset on listings (GOLF_DRIVER, IRON_SET, PUTTER, SMALL_ITEM).

4. **Checkout**  
   Stripe Checkout is already configured to collect the buyer’s **shipping address** (UK only). New orders will have the buyer address saved so labels can be created.

## Flow

- **Checkout**: Buyer enters shipping address in Stripe Checkout (collected automatically).
- **Webhook**: On `checkout.session.completed`, we store `buyer_name`, `buyer_address_line1`, `buyer_city`, `buyer_postcode`, `buyer_country` on the transaction.
- **Seller**: In Dashboard → Sales, for a pending order the seller clicks **Create label**. The API uses the seller’s postage address (Settings → Postage) and the buyer’s address to create a Shippo shipment, purchase the first available rate, and save the label URL and tracking number. The label opens in a new tab.
- **Mark as shipped**: Seller clicks **Mark as shipped** when they’ve sent the item. Optional: when Shippo webhooks are wired, tracking updates can auto-set **in transit** → shipped and **delivered** → delivered (see below).

## Tracking automation (webhooks)

When a label is created we set `fulfilment_status = LABEL_CREATED` and `order_state = label_created`. Progress can be updated in two ways:

1. **Manual (MVP)**  
   Seller clicks **Mark as shipped** → `fulfilment_status = SHIPPED`, `status = shipped`, `shipped_at` set. This remains available even when webhooks are configured.

2. **Shippo webhooks (optional)**  
   If you configure a webhook in the [Shippo API Portal](https://portal.goshippo.com/api-config/webhooks), the app will accept `track_updated` and auto-update:
   - **IN_TRANSIT** / **TRANSIT** → `fulfilment_status = SHIPPED`, `status = shipped`, `order_state = shipped`, `shipped_at`
   - **DELIVERED** → `fulfilment_status = DELIVERED`, `order_state = delivered`

**To wire the webhook:** In Shippo → Webhooks, add a webhook with:
- **URL:** `https://YOUR_DOMAIN/api/webhooks/shippo` (must be &lt; 200 characters)
- **Event:** `track_updated`

When you purchase a label in Shippo, a tracking webhook is created automatically for that label; your endpoint will receive POST requests when the carrier reports status changes. Return 2XX within a few seconds so Shippo does not retry.

## DPD-only rates

Only **allowlisted** DPD UK services are used when buying a label (no Air Express, weekend, or other carriers). The selected service comes from checkout:

- **DPD_NEXT_DAY** (default) – e.g. Door to Door Next Day
- **DPD_SHIP_TO_SHOP** – optional Ship to Shop / Parcelshop

Allowlisted Shippo `servicelevel.token` values are in `lib/shippo.ts` (`ALLOWLISTED_SERVICELEVEL_TOKENS`). If your Shippo account returns different tokens, create a label once; when no allowlisted rate is found, the server logs `[Shippo] No allowlisted rate for ... Received rates: [...]`. Use that output to add the correct tokens to the allowlist.

## Parcel presets

Each listing has a **parcel preset** (set when creating the listing): GOLF_DRIVER, IRON_SET, PUTTER, SMALL_ITEM. Dimensions are in `lib/shippo.ts` (`PARCEL_PRESET_DIMENSIONS`). When the seller creates a label, the listing’s preset is used so DPD gets accurate dimensions and weight. Unknown or null preset falls back to SMALL_ITEM.

## References

- [Shippo API quickstart](https://docs.goshippo.com/docs/guides_general/api_quickstart/)
- [Generate your first label](https://docs.goshippo.com/docs/guides_general/generate_shipping_label/)
