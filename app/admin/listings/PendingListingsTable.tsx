"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { getListingDisplayTitle } from "@/lib/listing-display";
import { getListingImageUrl } from "@/lib/listing-images";
import type { PendingListing } from "@/lib/admin-data";
import type { Listing } from "@/types/database";

export default function PendingListingsTable({ listings }: { listings: PendingListing[] }) {
  const router = useRouter();
  const [items, setItems] = useState<PendingListing[]>(listings);
  useEffect(() => {
    setItems(listings);
  }, [listings]);
  const imageUrl = (path: string) => getListingImageUrl(path, "thumb");

  const action = async (id: string, type: "approve" | "reject" | "flag") => {
    const res = await fetch(`/api/admin/listings/${id}/${type}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    } else {
      alert((data as { error?: string }).error ?? "Failed");
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/80">
        No pending listings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((l) => (
        <div key={l.id} className="rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            <Link href={`/admin/listings/${l.id}`} className="flex gap-2 overflow-x-auto group">
              {l.listing_images?.slice(0, 3).map((img, i) => (
                <img
                  key={i}
                  src={imageUrl(img.storage_path)}
                  alt=""
                  className="w-20 h-20 object-cover rounded-lg shrink-0 group-hover:ring-2 group-hover:ring-mowing-green/40 transition-shadow"
                />
              ))}
              <span className="self-center text-sm text-mowing-green/70 group-hover:text-mowing-green shrink-0">
                View →
              </span>
            </Link>
            <div>
              <Link href={`/admin/listings/${l.id}`} className="font-semibold text-mowing-green hover:underline">
                {getListingDisplayTitle(l as unknown as Listing)}
              </Link>
              {l.created_on_behalf && (
                <p className="text-xs text-mowing-green/60 mt-0.5">
                  Created by admin on behalf of {l.seller_email ?? "seller"}
                </p>
              )}
              <p className="text-sm text-mowing-green/70">{l.category} · {l.brand} · {l.condition}</p>
              <p className="font-semibold text-mowing-green mt-1">{formatPrice(l.price)}</p>
              {l.description && <p className="text-sm text-mowing-green/80 mt-2 line-clamp-2">{l.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              <button
                type="button"
                onClick={() => action(l.id, "approve")}
                className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => action(l.id, "reject")}
                className="rounded-lg border border-divot-pink text-divot-pink px-4 py-2 text-sm font-medium hover:bg-divot-pink/10"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => action(l.id, "flag")}
                className="rounded-lg border border-mowing-green/50 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/5"
              >
                Flag
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
