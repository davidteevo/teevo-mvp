# Event → Email Triggers

Automated emails fire from real user actions. Each send is recorded in `sent_emails` so webhook/API retries don’t send duplicates.

## Event → Email mapping (per spec)

| Event | Email | Recipient | Template | Trigger location |
|-------|--------|-----------|----------|------------------|
| `order.created` | Order confirmation | Buyer | Transactional | Stripe webhook `checkout.session.completed` |
| `order.created` | Item sold | Seller | Transactional | Stripe webhook `checkout.session.completed` |
| `payment.captured` | Payment received | Seller | Transactional | Stripe webhook `checkout.session.completed` |
| `shipment.created` | Shipping confirmation | Buyer | Transactional | `POST /api/transactions/[id]/shipped` |
| `delivery.confirmed` | Funds released | Seller | Transactional | `POST /api/transactions/[id]/confirm-receipt` |
| `payout.sent` | Review request | Seller | Transactional | P1 – not wired yet |
| `delivery.confirmed + 24h` | Payout confirmation | Buyer | Standard | P0 – needs cron/scheduler |
| `seller.kyc_required` | KYC incomplete reminder | Seller | Alert | Not wired – needs Stripe `account.updated` |
| `user.created` | Email verification | User | Alert | Supabase built-in (or custom hook) |
| `auth.password_reset_requested` | Forgot password | User | Alert | Supabase built-in (or custom hook) |
| `listing.pending` | New listing to verify | Admin | Alert | `POST /api/listings` |
| `packaging.submitted` | Packaging photos to review | Admin | Alert | `POST …/packaging-photos/submit` |
| `packaging.approved` | Packaging approved | Seller | Transactional | `POST …/packaging-photos/verify` |
| `packaging.rejected` | Packaging needs attention | Seller | Transactional | `POST …/packaging-photos/reject` |
| `packaging.approved` (manual) | Shipping label needed | Admin | Alert | `POST …/packaging-photos/verify` when `fulfilment_mode=manual` |
| `starter_pack.requested` | Your free Teevo Starter Pack is being prepared | Seller | Transactional | `POST …/packaging` with `starter_pack: true` |
| `starter_pack.requested` | ACTION REQUIRED: New Teevo Starter Pack Request | Admin | Alert | Same, after persist |
| `starter_pack.dispatched` | Your Teevo Starter Pack is on its way | Seller | Transactional | `POST …/starter-pack/dispatch` (includes tracking CTA) |
| `watchlist.still_available` | Still thinking about [Brand] [Model]? | Watcher | Standard | Daily cron `/api/cron/watchlist-reminders` |
| `watchlist.now_available` | A club on your Watchlist is now available | Watcher | Standard | Admin approve listing |
| `watchlist.price_drop` | Price drop: [Brand] [Model] is now £X | Watcher | Standard | `POST /api/listings/[id]/reduce-price` |
| `watchlist.sold` | The [Brand] [Model] you were watching has sold | Watcher | Standard | Checkout complete (`createTransactionAndSendEmails`) |
| `watchlist.unavailable` | [Brand] [Model] is no longer available | Watcher | Standard | Reject / archive / admin delete |

## Idempotency

- Before sending, we check `sent_emails` for `(email_type, reference_id)`.
- After a successful send, we insert a row so the same event doesn’t send again.
- Reference is usually the transaction `id`; for user emails it can be `user_id` or a token.

## Database

Run `docs/MIGRATION_sent_emails.sql` in Supabase to create the `sent_emails` table.

## Env

- `RESEND_API_KEY` – required for sending (server-side only).
- `NEXT_PUBLIC_APP_URL` – used for CTA links in emails.
- `TEEVO_ADMIN_EMAILS` – comma-separated; first address receives admin alerts (e.g. new listing to verify).
