# Teevo MVP – Development Task Breakdown

## Phase 1: Foundation
- [ ] Init Next.js app (App Router), Tailwind, TypeScript
- [ ] Add brand colours and Teevo logo to public; configure Tailwind theme
- [ ] Create Supabase project; run DATABASE_SCHEMA.sql; configure env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Supabase Auth: email/password sign up & sign in (email-only for MVP)
- [ ] Sync user to public.users on signup (trigger or API); role default buyer
- [ ] Auth middleware: protect /dashboard, /sell, /admin by role
- [ ] Layout: Header (logo, nav), Footer, TrustStrip

## Phase 2: Seller & Listings
- [ ] Stripe Connect: create Express account + AccountLink API; return URL handler; save stripe_account_id to users
- [ ] Dashboard: show “Complete seller setup” if seller without stripe_account_id
- [ ] Listing form: category, brand (dropdown), model, condition, price, description
- [ ] Image upload: 3–6 images to Supabase Storage; store paths in listing_images
- [ ] POST /api/listings (create with status pending); GET /api/listings (verified only) with filters
- [ ] GET /api/listings/[id] for detail page
- [ ] Sell success page: “Pending verification” message
- [ ] Dashboard: “My listings” with status (pending/verified/rejected/sold)

## Phase 3: Admin
- [ ] Admin layout: redirect non-admin to home
- [ ] GET /api/admin/listings/pending; approve/reject/flag APIs
- [ ] Admin UI: list pending listings; approve/reject/flag buttons
- [ ] Admin transactions list; optional intervene (note or refund)

## Phase 4: Buyer & Payments
- [ ] Home: listing grid; filters (category, brand, price)
- [ ] Listing detail page: images, description, condition, Verified badge, Buy button
- [ ] POST /api/checkout: create Stripe Checkout Session (destination = seller stripe_account_id); return URL
- [ ] Success URL: /purchase/success; create/update transaction on webhook checkout.session.completed
- [ ] Webhook: signature verification; handle checkout.session.completed, charge.refunded
- [ ] Dashboard “Purchases”: list transactions; “Confirm receipt” button
- [ ] Dashboard “Sales”: list sales; “Mark as shipped” button
- [ ] Auto-release: 3 days after shipped → complete (cron or serverless)

## Phase 5: Trust & Polish
- [ ] Trust badges on listing detail and footer: Verified, Secure payment, UK only
- [ ] Analytics: optional POST /api/events for listing_created, listing_approved, purchase
- [ ] Mobile-first pass: touch targets, responsive grid
- [ ] Error states and empty states
- [ ] Deploy to Vercel; configure Supabase and Stripe env; set Stripe webhook URL

## Out of scope (MVP)
- Native app, real AI auth, seller ratings, advanced disputes, international
