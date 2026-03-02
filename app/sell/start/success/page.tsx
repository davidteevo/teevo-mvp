"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { track } from "@/lib/analytics";

type ListingPreview = {
  id: string;
  category: string;
  brand: string;
  model: string;
  title?: string | null;
  condition: string;
  price: number;
  status: string;
  listing_images?: { storage_path: string; sort_order: number }[];
};

export default function SellStartSuccessPage() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");
  const [listing, setListing] = useState<ListingPreview | null>(null);
  const [loading, setLoading] = useState(!!listingId);

  useEffect(() => {
    if (!listingId) return;
    fetch("/api/listings/mine")
      .then((res) => res.json())
      .then((data) => {
        const list = data.listings as ListingPreview[] | undefined;
        const found = list?.find((l) => l.id === listingId) ?? null;
        setListing(found);
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  const whatsappUrl = process.env.NEXT_PUBLIC_SELLER_WHATSAPP_URL;
  const displayTitle = listing?.title?.trim() || (listing ? `${listing.brand} ${listing.model}`.trim() || listing.category : "");
  const imagePath = listing?.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
  const imageUrl = imagePath && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${imagePath}`
    : null;
  const statusLabel = listing?.status === "verified" ? "Live" : listing?.status === "rejected" ? "Rejected" : "Pending review";

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-par-3-punch" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-mowing-green">
        Your listing is live.
      </h1>
      <p className="mt-2 text-mowing-green/80">
        You&apos;re officially a Founding Seller.
      </p>

      {loading && (
        <p className="mt-6 text-mowing-green/60 text-sm">Loading your listing…</p>
      )}
      {!loading && listing && (
        <div className="mt-6 rounded-xl border border-mowing-green/20 bg-white p-4 text-left">
          <div className="flex gap-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-mowing-green/10 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-mowing-green truncate">
                {displayTitle || "Your listing"}
              </p>
              <p className="text-sm text-mowing-green/80">
                £{(listing.price / 100).toFixed(2)}
              </p>
              <span
                className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  listing.status === "verified"
                    ? "bg-par-3-punch/20 text-par-3-punch"
                    : listing.status === "rejected"
                      ? "bg-divot-pink/20 text-divot-pink"
                      : "bg-golden-tee/20 text-mowing-green"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/sell/start"
          className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-medium hover:opacity-90"
          onClick={() => track("seller_listing_published", { action: "list_another" })}
        >
          List another item
        </Link>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-mowing-green text-mowing-green px-6 py-3 font-medium hover:bg-mowing-green/5"
            onClick={() => track("seller_joined_whatsapp")}
          >
            Join Founding Sellers WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
