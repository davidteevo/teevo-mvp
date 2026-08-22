import type { ListingPhotoIllustrationId } from "@/lib/listing-photos/types";

const FOLDERS = {
  woods: "driver_woods_hybrids",
  drivingIrons: "driving_irons",
  ironsSingle: "irons_single",
  ironsSet: "irons_set",
  wedgesSingle: "wedges_single",
  wedgesSet: "wedges_set",
  putters: "putters",
} as const;

function folderFor(
  category: string,
  listingFormat?: "single" | "set" | "" | null
): string {
  if (category === "Driver" || category === "Woods" || category === "Hybrids") {
    return FOLDERS.woods;
  }
  if (category === "Driving Irons") return FOLDERS.drivingIrons;
  if (category === "Irons") {
    return listingFormat === "set" ? FOLDERS.ironsSet : FOLDERS.ironsSingle;
  }
  if (category === "Wedges") {
    return listingFormat === "set" ? FOLDERS.wedgesSet : FOLDERS.wedgesSingle;
  }
  if (category === "Putter") return FOLDERS.putters;
  return FOLDERS.woods;
}

export function listingPhotoGuideSrc(opts: {
  category: string;
  listingFormat?: "single" | "set" | "" | null;
  illustrationId: ListingPhotoIllustrationId;
}): string {
  const folder = folderFor(opts.category, opts.listingFormat);
  return `/listing-photo-guides/${folder}/${opts.illustrationId}.svg`;
}
