"use client";

import { listingPhotoGuideSrc } from "@/lib/listing-photos/guide-art";
import type { ListingPhotoIllustrationId } from "@/lib/listing-photos/types";

export function PhotoSlotIllustration({
  id,
  category,
  listingFormat,
}: {
  id: ListingPhotoIllustrationId;
  category: string;
  listingFormat?: "single" | "set" | "" | null;
}) {
  const src = listingPhotoGuideSrc({ category, listingFormat, illustrationId: id });
  return (
    <img
      src={src}
      alt=""
      className="w-full h-auto max-h-52 object-contain rounded-xl bg-[#FDFCF5]"
    />
  );
}
