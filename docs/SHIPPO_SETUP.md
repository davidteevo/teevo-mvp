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
- **Mark as shipped**: Seller clicks **Mark as shipped** when they’ve sent the item.

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
