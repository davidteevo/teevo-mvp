# Teevo MVP – Component Structure

## App Router (Next.js 14+)

```
app/
  layout.tsx                 # Root layout; nav; brand + trust strip
  page.tsx                    # Home = listing grid (verified only)
  globals.css                 # Tailwind + brand tokens

  (auth)/
    login/page.tsx
    signup/page.tsx

  listing/
    [id]/page.tsx             # Listing detail; Buy CTA; trust badges

  sell/
    page.tsx                  # Create listing form (category → brand → model → condition → price → description → images)
    success/page.tsx          # "Listing submitted – pending verification"

  dashboard/
    page.tsx                  # Seller: my listings, Stripe onboarding CTA; Buyer: my purchases
    listings/page.tsx         # My listings (seller)
    purchases/page.tsx        # My purchases (buyer)
    sales/page.tsx            # My sales (seller); mark shipped

  admin/
    layout.tsx                # Admin-only wrapper
    page.tsx                  # Overview: pending count, recent transactions
    listings/page.tsx         # Pending listings; approve/reject/flag
    transactions/page.tsx    # All transactions; intervene

  purchase/
    success/page.tsx          # Post-Checkout success

  api/                        # See API_ROUTES.md
```

## Shared components

```
components/
  layout/
    Header.tsx                # Logo, nav (Browse, Sell, Dashboard, Login)
    Footer.tsx                # Links, UK only, trust line
    TrustStrip.tsx            # "Verified listings · Secure payment · UK only"

  ui/                         # Reusable primitives
    Button.tsx
    Input.tsx
    Select.tsx
    Badge.tsx                 # Verified, New, Bargain
    Card.tsx                  # Listing card

  listing/
    ListingCard.tsx           # Thumbnail, title, price, condition, Verified badge
    ListingGrid.tsx           # Grid of ListingCard; filters
    ListingDetail.tsx         # Full detail view
    ListingForm.tsx           # Create/edit form
    ImageUpload.tsx           # 3–6 images; preview

  filters/
    CategoryFilter.tsx
    BrandFilter.tsx
    PriceFilter.tsx

  trust/
    VerifiedBadge.tsx         # "Verified listing" (AI-assisted auth copy)
    SecurePaymentBadge.tsx
    UKOnlyBadge.tsx

  dashboard/
    OnboardingStripeBanner.tsx  # CTA to complete Connect if seller without stripe_account_id
    MyListingsTable.tsx
    PurchasesTable.tsx
    SalesTable.tsx            # Mark shipped

  admin/
    PendingListingsTable.tsx
    TransactionTable.tsx
    ApproveRejectButtons.tsx
```

## Design tokens (Tailwind)

- **Mowing Green** `#265C4B` – primary (logo, headings, buttons)
- **Par-3 Punch** `#49C184` – secondary (borders, icons)
- **Golden Tee** `#FFD25E` – accent (New, Bargain badges)
- **Off-White Pique** `#FDFCF5` – background
- **Divot Pink** `#FF8A8A` – like/notifications (minimal in MVP)

Use in `tailwind.config.ts` and `globals.css` for consistency.
