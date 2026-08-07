# Staging & Deploy Guide

How Teevo is deployed, how to use **staging** (`test.teevohq.com`), and how to promote to **production** (`app.teevohq.com`).

---

## Environments

| | Local | Staging | Production |
|--|--------|---------|------------|
| **URL** | `http://localhost:3000` | `https://test.teevohq.com` | `https://app.teevohq.com` |
| **Git branch** | feature / working branch | `staging` | `main` |
| **Host** | your machine | **Separate** Netlify site | Existing Netlify site |
| **`NEXT_PUBLIC_APP_ENV`** | `development` | `staging` | `production` |
| **Supabase** | your local/dev project | **Teevo Staging** project | **Teevo Production** project |
| **Stripe** | test keys | test keys + staging webhook | live keys + prod webhook |
| **Shippo** | `shippo_test_...` | `shippo_test_...` | `shippo_live_...` |

**Never** point staging at production Supabase or Stripe live keys.

---

## Developing a feature

1. Open the Teevo project in Cursor.
2. Create or change the feature on a working branch (or locally on `staging`).
3. Test locally (`npm run dev`) with `.env.local` (Stripe **test**, Shippo **test**).
4. Push / merge into the **`staging`** branch.
5. Wait for the **staging** Netlify site to finish deploying.
6. Open `https://test.teevohq.com` (enter Netlify site password if prompted).
7. Confirm the yellow **TEST ENVIRONMENT** badge is visible.
8. Test the feature end-to-end on staging.
9. If successful, merge the same changes into **`main`** (deliberate — no auto-promote).
10. Wait for the **production** Netlify deploy, then verify `https://app.teevohq.com`.

Staging changes are **never** auto-promoted to production.

---

## Roll back production

1. Netlify → **production** site → **Deploys**.
2. Open the last known-good deploy → **Publish deploy**.
3. Confirm `https://app.teevohq.com` is healthy (e.g. `/api/health`).

**Database:** publishing an old deploy does **not** undo SQL migrations. If a bad migration was applied to production, fix forward with a new migration (or restore from a Supabase backup). Prefer applying schema changes to **staging first**.

---

## Manual setup checklist (one-time)

Complete these in external dashboards. Do **not** change production Netlify env vars, domains, or live Stripe/Shippo webhooks while doing this.

### 1. Git — `staging` branch

```bash
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

Keep `main` as production. Use `staging` for test deploys only.

### 2. Netlify — new staging site

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Select repo `davidteevo/teevo-mvp`.
3. **Branch to deploy:** `staging` (this site’s production branch).
4. Build: `npm run build` (from `netlify.toml`); leave publish directory blank.
5. **Do not** reuse or edit the existing production site’s settings for this.

### 3. DNS — `test.teevohq.com`

1. Staging Netlify site → **Domain management** → **Add custom domain** → `test.teevohq.com`.
2. At your DNS provider, add a **CNAME**: `test` → the hostname Netlify shows (e.g. `something.netlify.app`).
3. Wait for DNS + SSL. Leave `app` and `admin` records unchanged.

### 4. Netlify password protection

Staging site → **Site configuration** → **Visitor access** (or **Password protection**) → enable a site password. Share only with people who should test.

### 5. Supabase — project **Teevo Staging**

1. Create a **new** project. Do **not** copy production user PII.
2. Apply schema (SQL Editor), in order:

**Base schema & storage**

- `docs/DATABASE_SCHEMA.sql`
- Create storage buckets:
  - `listings` — **public**
  - `avatars` — **public** (see `docs/SETUP_SUPABASE_STRIPE.md`)
  - `packaging-photos` — **private**; run `docs/SUPABASE_PACKAGING_PHOTOS_STORAGE.sql`
- Run `docs/SUPABASE_LISTINGS_STORAGE.sql` (policies) if not covered by schema docs

**`supabase/migrations/`** (by filename timestamp)

- `20250304120000_add_handed_to_listings.sql`
- `20250305120000_buyer_notify_me.sql`
- `20250309120000_messaging_mvp.sql`
- `20250309130000_messaging_analytics.sql`
- `20250309140000_listings_clothing_accessories.sql`
- `20250309140000_listings_title_and_fair.sql`
- `20250309150000_merge_apparel_into_clothing.sql`
- `20250309150000_offers_initiated_by.sql`
- `20250309160000_founding_seller_rank.sql`
- `20250309170000_add_driving_irons_hybrids.sql`
- `20250309180000_listings_archived_at.sql`
- `20250317120000_admin_create_listing_on_behalf.sql`
- `20260318090000_add_club_specs_columns.sql`
- `20260318120000_listings_degree_numeric.sql`

**Additional `docs/MIGRATION_*.sql`** (apply any not already included above; skip if a statement errors as “already exists”)

- `docs/MIGRATION_users_first_surname.sql`
- `docs/MIGRATION_listings_title_fair.sql`
- `docs/MIGRATION_listings_shaft_flex.sql`
- `docs/MIGRATION_listings_shaft_degree_woods.sql`
- `docs/MIGRATION_listings_parcel_preset.sql`
- `docs/MIGRATION_transactions_stripe_columns.sql`
- `docs/MIGRATION_transactions_shippo.sql`
- `docs/MIGRATION_transactions_shippo_qr_code.sql`
- `docs/MIGRATION_transactions_fulfilment.sql`
- `docs/MIGRATION_transactions_packaging_photos.sql`
- `docs/MIGRATION_transactions_packaging_review_audit.sql`
- `docs/MIGRATION_transactions_all_webhook_columns.sql`
- `docs/MIGRATION_sent_emails.sql`
- `docs/MIGRATION_events.sql`

3. **Authentication → URL Configuration**
   - **Site URL:** `https://test.teevohq.com`
   - **Redirect URLs:**  
     `https://test.teevohq.com/auth/callback`  
     `https://test.teevohq.com/**`  
     `https://test.teevohq.com/api/auth/set-password`  
     `https://test.teevohq.com/login/reset-password`

4. **Authentication → Hooks → Send Email** (HTTP)  
   - URL: `https://test.teevohq.com/api/auth/send-email`  
   - Copy secret → Netlify staging `SEND_EMAIL_HOOK_SECRET`

5. After first signup on staging, make yourself admin:

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Stripe — test mode only

1. Stripe Dashboard → toggle **Test mode**.
2. **Developers → Webhooks → Add endpoint**  
   - URL: `https://test.teevohq.com/api/webhooks/stripe`  
   - Events: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`, `refund.updated` (match production).
3. Copy signing secret → staging Netlify `STRIPE_WEBHOOK_SECRET`.
4. Use **test** secret + publishable keys on the staging site only.
5. Do **not** change live-mode Connect or production webhook endpoints.

### 7. Shippo — test token

1. Use `SHIPPO_API_TOKEN=shippo_test_...` on staging (never `shippo_live_`).
2. Optional: `SHIPPO_DPD_CARRIER_ACCOUNT_ID` for test-mode rates (see `docs/SHIPPO_SETUP.md`).
3. If tracking webhooks are used: point a **test**-token webhook at  
   `https://test.teevohq.com/api/webhooks/shippo` (`track_updated`).
4. **Limitation:** Shippo test mode does not buy real carrier labels. Staging must never use a live token.

### 8. Staging Netlify environment variables

Set on the **staging** site only:

| Variable | Staging value |
|----------|----------------|
| `NEXT_PUBLIC_APP_ENV` | `staging` |
| `NEXT_PUBLIC_APP_URL` | `https://test.teevohq.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Staging webhook `whsec_...` |
| `SHIPPO_API_TOKEN` | `shippo_test_...` |
| `SHIPPO_DPD_CARRIER_ACCOUNT_ID` | optional |
| `RESEND_API_KEY` | same or dedicated key |
| `SEND_EMAIL_HOOK_SECRET` | Staging Supabase hook secret |
| `TEEVO_ADMIN_EMAILS` | your test admin email(s) |
| `OPENAI_API_KEY` | optional |
| `NEXT_PUBLIC_BUYING_ENABLED` | `true` when testing checkout |
| `NEXT_PUBLIC_BOOK_CALL_URL` | optional |

**Do not set on staging:**

- `NEXT_PUBLIC_COOKIE_DOMAIN` — leave **unset** so cookies stay host-only on `test.teevohq.com` (production may use `.teevohq.com` for app + admin).
- `NEXT_PUBLIC_ADMIN_DOMAIN` — omit unless you deliberately add a staging admin host.

Redeploy after setting env vars (`NEXT_PUBLIC_*` are baked into the build).

### 9. Production Netlify (verify only)

Confirm production still has:

- Live Stripe keys + webhook → `https://app.teevohq.com/api/webhooks/stripe`
- Production Supabase keys
- `NEXT_PUBLIC_APP_URL=https://app.teevohq.com`
- `NEXT_PUBLIC_APP_ENV=production` (add if missing)
- Cookie domain for admin as today (`.teevohq.com` if used)
- Shippo **live** token only on production

Optionally: restrict Deploy Previews on the production site so they do not share live Stripe / prod Supabase credentials.

---

## Schema change workflow

1. Write migration SQL (prefer `supabase/migrations/` with a timestamped name).
2. Apply to **Teevo Staging** SQL Editor; test on `test.teevohq.com`.
3. When approved, apply the **same** SQL intentionally to **production**.
4. Deploy app code that depends on the new schema to staging, then to `main`.

Never auto-run destructive production migrations from CI.

---

## What staging does in the app

| Behaviour | Staging | Production |
|-----------|---------|------------|
| Yellow **TEST ENVIRONMENT** badge | Yes | No |
| `robots.txt` / meta noindex | Disallow / noindex | Indexable |
| Email subject prefix | `[TEEVO TEST] ...` | Unchanged |
| Google Analytics | Off | On |

---

## Acceptance smoke test (staging)

Use **only** staging accounts and Stripe **test** cards.

**Account:** signup, login, logout, password reset  

**Seller:** seller setup, create/edit listing, upload images, receive an order  

**Buyer:** browse, checkout with Stripe test payment, view order  

**Fulfilment:** paid → packaging → packaging photo → admin verify → Shippo test label → mark shipped → buyer status  

**Admin:** packaging / sellers against staging data only  

Confirm `app.teevohq.com` still works normally after any production deploy.

---

## Related docs

- `docs/DEPLOY_NETLIFY.md` — production Netlify setup
- `docs/SETUP_SUPABASE_STRIPE.md` — Supabase + Stripe
- `docs/SHIPPO_SETUP.md` — Shippo test vs live
- `docs/STRIPE_CONFIG_NETLIFY.md` — Stripe on Netlify
