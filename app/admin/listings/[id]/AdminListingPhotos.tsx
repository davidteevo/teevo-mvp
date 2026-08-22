import { getListingImageUrl, publicListingImages, sortListingImages } from "@/lib/listing-images";
import { VERIFICATION_LISTINGS_BUCKET } from "@/lib/listing-photos/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Img = {
  storage_path: string;
  sort_order: number;
  image_type?: string | null;
  visibility?: string | null;
  slot_key?: string | null;
  club_identifier?: string | null;
  storage_bucket?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  hero: "Hero",
  face: "Face",
  sole: "Sole",
  crown: "Crown",
  back: "Back",
  shaft: "Shaft",
  grip: "Grip",
  set_overview: "Set overview",
  wedge_specs: "Wedge specs",
  putter_address: "Address view",
  putter_rear: "Rear",
  extra: "Additional",
  legacy: "Listing photo",
  hosel_serial: "Hosel / serial",
  putter_neck: "Neck / serial",
};

export async function AdminListingPhotos({
  admin,
  listingId,
  images,
  hoselSerialStatus,
}: {
  admin: SupabaseClient;
  listingId: string;
  images: Img[];
  hoselSerialStatus?: string | null;
}) {
  const sorted = sortListingImages(images ?? []);
  const publicImages = publicListingImages(sorted);
  const privateImages = sorted.filter((img) => img.visibility === "verification_only");

  const signed = new Map<string, string>();
  for (const img of privateImages) {
    const bucket = admin.storage.from(img.storage_bucket || VERIFICATION_LISTINGS_BUCKET);
    const { data } = await bucket.createSignedUrl(img.storage_path, 3600);
    if (data?.signedUrl) signed.set(img.storage_path, data.signedUrl);
  }

  const groupedPublic = publicImages.reduce<Record<string, Img[]>>((acc, img) => {
    const key = img.image_type || "legacy";
    acc[key] = acc[key] ?? [];
    acc[key].push(img);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-mowing-green/70 uppercase tracking-wide">
          Listing photos ({publicImages.length})
        </h2>
        <div className="mt-3 space-y-4">
          {Object.entries(groupedPublic).map(([type, group]) => (
            <div key={type}>
              <p className="text-xs font-medium text-mowing-green/60 mb-2">{TYPE_LABEL[type] ?? type}</p>
              <div className="grid grid-cols-3 gap-3">
                {group.map((img) => {
                  const url = getListingImageUrl(img.storage_path, "main");
                  return (
                    <a
                      key={img.storage_path}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square block rounded-lg overflow-hidden border border-par-3-punch/20 bg-mowing-green/5"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
          {publicImages.length === 0 ? (
            <p className="text-sm text-mowing-green/50">No public photos</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-mowing-green/20 bg-mowing-green/5 p-4">
        <h2 className="text-sm font-semibold text-mowing-green uppercase tracking-wide">
          🔒 Teevo verification · Internal
        </h2>
        {hoselSerialStatus === "not_found" ? (
          <p className="mt-2 text-sm text-mowing-green/70">Seller couldn&apos;t find a serial number.</p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {privateImages.map((img) => {
            const url = signed.get(img.storage_path);
            return (
              <div key={img.storage_path}>
                <p className="text-xs font-medium text-mowing-green/60 mb-1">
                  {TYPE_LABEL[img.image_type ?? ""] ?? "Verification"}
                </p>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-white">
                    <img src={url} alt="" className="w-full h-full object-contain" />
                  </a>
                ) : (
                  <p className="text-xs text-mowing-green/50">Could not load signed URL</p>
                )}
              </div>
            );
          })}
        </div>
        {privateImages.length === 0 && hoselSerialStatus !== "not_found" ? (
          <p className="mt-2 text-sm text-mowing-green/60">No internal verification photos on this listing.</p>
        ) : null}
      </div>
      <p className="text-xs text-mowing-green/60">Click images to open full size. Listing id {listingId.slice(0, 8)}…</p>
    </div>
  );
}
