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
  created_by_admin?: boolean;
  invited_at?: string | null;
  phone?: string | null;
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
  handed: "left" | "right" | null;
  item_type: string | null;
  size: string | null;
  colour: string | null;
  status: ListingStatus;
  flagged: boolean;
  created_by_admin_id?: string | null;
  created_on_behalf?: boolean;
  created_at: string;
  updated_at: string;
  listing_images?: { id: string; storage_path: string; sort_order: number }[];
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  stripe_payment_id: string | null;
  stripe_transfer_id: string | null;
  amount: number;
  status: TransactionStatus;
  shipped_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
