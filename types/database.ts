export type UserRole = "buyer" | "seller" | "admin";

export type ListingCategory =
  | "Driver"
  | "Irons"
  | "Wedges"
  | "Putter"
  | "Apparel"
  | "Bag";

export type ListingCondition = "New" | "Excellent" | "Good" | "Used";

export type ListingStatus = "pending" | "verified" | "rejected" | "sold";

export type TransactionStatus =
  | "pending"
  | "shipped"
  | "complete"
  | "refunded"
  | "dispute";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  stripe_account_id: string | null;
  avatar_path: string | null;
  display_name: string | null;
  location: string | null;
  handicap: number | null;
  handed: "left" | "right" | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  category: ListingCategory;
  brand: string;
  model: string;
  condition: ListingCondition;
  description: string | null;
  price: number;
  status: ListingStatus;
  flagged: boolean;
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
