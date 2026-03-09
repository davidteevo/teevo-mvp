/**
 * Message filter to block off-platform communication.
 * Prevents sharing: phone numbers, emails, social handles, external payment links.
 */

const BLOCKED_PHRASES = [
  /\bwhatsapp\b/i,
  /\binstagram\b/i,
  /\bfacebook\b/i,
  /\bfb\b/i,
  /\btwitter\b/i,
  /\bx\.com\b/i,
  /\bsnapchat\b/i,
  /\bpaypal\b/i,
  /\bvenmo\b/i,
  /\bcash\s*app\b/i,
  /\bmessage\s*me\s*on\b/i,
  /\bcall\s*me\b/i,
  /\btext\s*me\b/i,
  /\bpay\s*via\b/i,
  /\bbank\s*transfer\b/i,
  /\btransfer\s*me\b/i,
  /\boutside\s*(of)?\s*teevo\b/i,
  /\boff\s*platform\b/i,
  /\bmy\s*(number|email|phone|instagram|whatsapp)\b/i,
  /\b(phone|mobile|tel)\s*:?\s*\d/i,
];

/** UK phone: 07xxx, 01xxx, +44, etc. */
const UK_PHONE =
  /(\+44|0)\s*\d{2,4}\s*\d{3,4}\s*\d{3,4}|\b07\d{2}\s*\d{3}\s*\d{3}\b|\b0\d{3}\s*\d{3}\s*\d{3}\b/;

/** Generic phone: sequences of digits with spaces/dashes/dots, 10+ digits */
const GENERIC_PHONE = /\b\d[\d\s\-\.]{8,}\d\b|\b\d{10,}\b/;

/** Email: local@domain */
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

/** Instagram/social handles: @handle */
const SOCIAL_HANDLE = /\b@[a-zA-Z0-9._]+\b/;

const BLOCK_REASON_MESSAGE =
  "This message cannot be sent. Please keep transactions on Teevo.";

/**
 * Returns true if the message body should be blocked (contains off-platform contact info).
 */
export function isMessageBlocked(body: string): boolean {
  const normalized = body.trim();
  if (!normalized) return true;

  if (EMAIL.test(normalized)) return true;
  if (UK_PHONE.test(normalized)) return true;
  if (GENERIC_PHONE.test(normalized)) return true;
  if (SOCIAL_HANDLE.test(normalized)) return true;

  for (const pattern of BLOCKED_PHRASES) {
    if (pattern.test(normalized)) return true;
  }

  return false;
}

/**
 * Returns the user-facing block reason (for 400 responses).
 */
export function getBlockReason(): string {
  return BLOCK_REASON_MESSAGE;
}
