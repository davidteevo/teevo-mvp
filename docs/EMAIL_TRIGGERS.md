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

## Idempotency

- Before sending, we check `sent_emails` for `(email_type, reference_id)`.
- After a successful send, we insert a row so the same event doesn’t send again.
- Reference is usually the transaction `id`; for user emails it can be `user_id` or a token.

## Database

Run `docs/MIGRATION_sent_emails.sql` in Supabase to create the `sent_emails` table.

## Env

- `RESEND_API_KEY` – required for sending (server-side only).
- `NEXT_PUBLIC_APP_URL` – used for CTA links in emails.
