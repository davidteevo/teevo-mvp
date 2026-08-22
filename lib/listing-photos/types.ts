export const LISTING_IMAGE_TYPES = [
  "hero",
  "face",
  "sole",
  "crown",
  "back",
  "hosel_serial",
  "shaft",
  "grip",
  "set_overview",
  "wedge_specs",
  "putter_address",
  "putter_rear",
  "putter_neck",
  "extra",
  "legacy",
] as const;

export type ListingImageType = (typeof LISTING_IMAGE_TYPES)[number];

export type ListingImageVisibility = "public" | "verification_only";

export type ListingPhotoIllustrationId =
  | "hero"
  | "face"
  | "sole"
  | "crown"
  | "back"
  | "hosel"
  | "shaft"
  | "grip"
  | "set_overview"
  | "putter_address"
  | "putter_rear"
  | "putter_neck";

export type PhotoSlot = {
  key: string;
  imageType: ListingImageType;
  visibility: ListingImageVisibility;
  required: boolean;
  title: string;
  helper: string;
  illustrationId: ListingPhotoIllustrationId;
  clubIdentifier?: string | null;
  serialHelp?: boolean;
};

export type ListingImageMeta = {
  id: string;
  storage_path: string;
  sort_order: number;
  image_type?: ListingImageType | null;
  visibility?: ListingImageVisibility | null;
  is_required?: boolean | null;
  club_identifier?: string | null;
  slot_key?: string | null;
  storage_bucket?: string | null;
};

export const PUBLIC_LISTINGS_BUCKET = "listings";
export const VERIFICATION_LISTINGS_BUCKET = "listing-verification";
export const MAX_LISTING_IMAGES = 16;
export const MIN_GENERIC_LISTING_IMAGES = 5;
export const MAX_GENERIC_LISTING_IMAGES = 6;
