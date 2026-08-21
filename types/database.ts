export type UserRole = "buyer" | "seller" | "admin";

export type ListingCategory =
  | "Driver"
  | "Woods"
  | "Driving Irons"
  | "Hybrids"
  | "Irons"
  | "Wedges"
  | "Putter"
  | "Bag"
  | "Clothing"
  | "Accessories";

export type ListingCondition =
  | "New"
  | "Excellent"
  | "Good"
  | "Fair"
  | "Used"
  | "New with tags"
  | "New without tags";

export type ListingStatus = "pending" | "verified" | "rejected" | "sold";

export type StandardSpecStatus = "standard" | "customised" | "unknown";

export type ListingFormat = "single" | "set";

export type CustomisedAspect = "shaft" | "length" | "loft_lie" | "grip" | "other";

export type SpecProvenanceSource = "seller" | "manufacturer_catalogue" | "image_ai";

export type SpecProvenanceConfidence = "confirmed" | "reference" | "inferred";

export type SpecProvenanceEntry = {
  source: SpecProvenanceSource;
  confidence: SpecProvenanceConfidence;
};

export type SpecProvenanceMap = Record<string, SpecProvenanceEntry>;

export type AvailabilityConfirmationStatus =
  | "required"
  | "confirmed_available"
  | "confirmed_unavailable"
  | "expired";

export type AvailabilityConfirmationSource =
  | "dispatch_timeout"
  | "admin_reconfirm"
  | "stale_listing";

export type DispatchClockPauseReason = "starter_pack" | "packaging_review" | "manual_label";

export type DispatchExtensionStatus = "requested" | "approved" | "declined" | "superseded";

export type CancellationReason = "seller_dispatch_timeout" | "admin_override";

export type CancellationStatus = "in_progress" | "completed" | "failed";

export type TransactionStatus =
  | "pending"
  | "shipped"
  | "complete"
  | "refunded"
  | "dispute";

export type MessageType =
  | "text"
  | "offer"
  | "offer_accepted"
  | "offer_declined"
  | "offer_countered"
  | "offer_withdrawn"
  | "offer_expired";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered"
  | "withdrawn"
  | "expired";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  stripe_account_id: string | null;
  avatar_path: string | null;
  display_name: string | null;
  chat_display_name: string | null;
  first_name: string | null;
  surname: string | null;
  location: string | null;
  handicap: number | null;
  handed: "left" | "right" | null;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_country: string | null;
  date_of_birth: string | null;
  founding_seller_rank: number | null;
  founder_joined_at?: string | null;
  founder_reward_status?: "none" | "eligible" | "earned";
  founder_reward_earned_at?: string | null;
  founder_reward_listing_id?: string | null;
  rating_average?: number | null;
  rating_count?: number;
  created_by_admin?: boolean;
  invited_at?: string | null;
  phone?: string | null;
  /** When included in an admin signup digest; NULL = not yet reported. */
  admin_signup_digest_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  category: ListingCategory;
  brand: string;
  model: string | null;
  title?: string | null;
  condition: ListingCondition;
  description: string | null;
  price: number;
  shaft: string | null;
  degree: string | null;
  shaft_flex: string | null;
  lie_angle: string | null;
  club_length: string | null;
  shaft_weight: string | null;
  shaft_material: string | null;
  grip_brand: string | null;
  grip_model: string | null;
  grip_size: string | null;
  grip_condition: string | null;
  handed: "left" | "right" | null;
  standard_spec_status?: StandardSpecStatus | null;
  customised_aspects?: CustomisedAspect[] | null;
  customised_other_note?: string | null;
  listing_format?: ListingFormat | null;
  iron_number?: string | null;
  set_composition?: string[] | null;
  bounce?: string | null;
  grind?: string | null;
  head_number?: string | null;
  spec_provenance?: SpecProvenanceMap | null;
  item_type: string | null;
  size: string | null;
  colour: string | null;
  status: ListingStatus;
  flagged: boolean;
  created_by_admin_id?: string | null;
  created_on_behalf?: boolean;
  archived_at?: string | null;
  buying_paused?: boolean;
  availability_confirmation_status?: AvailabilityConfirmationStatus | null;
  availability_confirmation_source?: AvailabilityConfirmationSource | null;
  availability_confirmation_requested_at?: string | null;
  availability_confirmed_at?: string | null;
  availability_confirmation_reminder_sent_at?: string | null;
  availability_confirmation_batch_id?: string | null;
  created_at: string;
  updated_at: string;
  listing_images?: { id: string; storage_path: string; sort_order: number }[];
  listing_clubs?: ListingClub[];
}

export interface ListingClub {
  id: string;
  listing_id: string;
  sort_order: number;
  club_type: string;
  iron_number?: string | null;
  degree: string | null;
  bounce: string | null;
  grind: string | null;
  shaft?: string | null;
  shaft_flex?: string | null;
  lie_angle?: string | null;
  club_length?: string | null;
  shaft_weight?: string | null;
  shaft_material?: string | null;
  grip_brand?: string | null;
  grip_model?: string | null;
  grip_size?: string | null;
  grip_condition?: string | null;
  spec_provenance?: SpecProvenanceMap | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  listing_id: string;
  watched_price_pence: number | null;
  last_availability_email_at: string | null;
  last_now_available_email_at: string | null;
  last_price_alert_at: string | null;
  last_price_alert_pence: number | null;
  last_sold_email_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  stripe_payment_id: string | null;
  stripe_transfer_id: string | null;
  amount: number;
  referral_discount_pence?: number;
  credit_redeemed_pence?: number;
  referral_id?: string | null;
  status: TransactionStatus;
  shipped_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  original_dispatch_deadline_at?: string | null;
  dispatch_deadline_at?: string | null;
  dispatch_clock_paused_at?: string | null;
  dispatch_clock_pause_reason?: DispatchClockPauseReason | null;
  dispatch_extension_status?: DispatchExtensionStatus | null;
  dispatch_extension_requested_at?: string | null;
  dispatch_extension_responded_at?: string | null;
  dispatch_extension_responded_by?: string | null;
  dispatch_extension_business_days?: number | null;
  dispatch_reminder_after_purchase_sent_at?: string | null;
  dispatch_reminder_one_day_sent_at?: string | null;
  dispatch_reminder_final_sent_at?: string | null;
  cancellation_reason?: CancellationReason | null;
  cancelled_at?: string | null;
  cancellation_status?: CancellationStatus | null;
  stripe_refund_id?: string | null;
  listing?: Listing;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  message_type: MessageType;
  offer_id: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_pence: number;
  status: OfferStatus;
  expires_at: string;
  counter_offer_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SellerReviewStatus = "active" | "hidden" | "removed";

export interface SellerReview {
  id: string;
  transaction_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  rating: number;
  review_text: string | null;
  listing_title_snapshot: string;
  status: SellerReviewStatus;
  editable_until: string;
  requires_admin_action: boolean;
  moderated_at: string | null;
  moderated_by: string | null;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type ReferralCodeKind = "user" | "creator";
export type ReferralCodeStatus = "active" | "disabled";
export type CreatorStatus = "active" | "paused" | "disabled";
export type ReferralSource = "url" | "code" | "creator_url" | "creator_code";
export type ReferralPriorityName = "supply" | "demand";
export type ReferralRewardTypeName =
  | "buyer_referrer_credit"
  | "seller_listing_credit"
  | "seller_sale_credit"
  | "creator_commission"
  | "referred_seller_listing_credit";
export type ReferralRewardStatusName = "pending" | "approved" | "paid" | "cancelled" | "reversed";
export type CreditTransactionType =
  | "referral_buyer_reward"
  | "seller_listing_referral"
  | "seller_sale_referral"
  | "referred_seller_listing_credit"
  | "admin_adjustment"
  | "redemption"
  | "reversal"
  | "founder_listing_reward";
export type CreditTransactionStatus = "pending" | "available" | "redeemed" | "reversed" | "cancelled";

export interface ReferralCode {
  id: string;
  code: string;
  owner_user_id: string | null;
  kind: ReferralCodeKind;
  status: ReferralCodeStatus;
  created_at: string;
  updated_at: string;
}

export interface Creator {
  id: string;
  user_id: string | null;
  name: string;
  social_handle: string | null;
  social_url: string | null;
  referral_code_id: string;
  commission_pence: number;
  status: CreatorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code_id: string | null;
  creator_id: string | null;
  source: ReferralSource;
  reward_priority: ReferralPriorityName | null;
  attributed_at: string;
  created_at: string;
}

export interface ReferralReward {
  id: string;
  referral_id: string;
  reward_type: ReferralRewardTypeName;
  amount_pence: number;
  status: ReferralRewardStatusName;
  related_transaction_id: string | null;
  related_listing_id: string | null;
  credit_transaction_id: string | null;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount_pence: number;
  type: CreditTransactionType;
  status: CreditTransactionStatus;
  referral_reward_id: string | null;
  related_transaction_id: string | null;
  expires_at: string | null;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  updated_at: string;
}
