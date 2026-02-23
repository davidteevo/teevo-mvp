import type { EmailType } from "@/lib/email";
import { sendEmail } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Email types from the Automated Emails spec. Used for idempotency key. */
export const EmailTriggerType = {
  ORDER_CONFIRMATION: "order_confirmation",
  ITEM_SOLD: "item_sold",
  PAYMENT_RECEIVED: "payment_received",
  SHIPPING_CONFIRMATION: "shipping_confirmation",
  FUNDS_RELEASED: "funds_released",
  REVIEW_REQUEST: "review_request",
  PAYOUT_CONFIRMATION: "payout_confirmation",
  KYC_INCOMPLETE_REMINDER: "kyc_incomplete_reminder",
  EMAIL_VERIFICATION: "email_verification",
  FORGOT_PASSWORD: "forgot_password",
} as const;

export type EmailTriggerTypeValue = (typeof EmailTriggerType)[keyof typeof EmailTriggerType];

/**
 * Idempotent send: if we already sent this email_type + reference_id, skip.
 * Otherwise send and record in sent_emails so webhook retries don't duplicate.
 */
export async function ensureEmailSent(
  admin: SupabaseClient,
  opts: {
    emailType: EmailTriggerTypeValue;
    referenceId: string;
    referenceType?: "transaction" | "user";
    recipientId?: string | null;
    to: string;
    subject: string;
    type: EmailType;
    variables: Record<string, string>;
  }
): Promise<boolean> {
  const { emailType, referenceId, referenceType = "transaction", recipientId, to, subject, type, variables } = opts;

  const { data: existing } = await admin
    .from("sent_emails")
    .select("id")
    .eq("email_type", emailType)
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (existing) {
    return false;
  }

  await sendEmail({ type, to, subject, variables });

  await admin.from("sent_emails").insert({
    email_type: emailType,
    reference_type: referenceType,
    reference_id: referenceId,
    recipient_id: recipientId ?? null,
  });

  return true;
}

/** Format pence as GBP string for emails. */
export function formatGbp(pence: number): string {
  return (pence / 100).toFixed(2);
}
