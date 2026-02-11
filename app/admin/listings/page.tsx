"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

type Listing = {
  id: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  description: string | null;
  created_at: string;
  listing_images?: { storage_path: string; sort_order: number }[];
};

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);

  const load = () => {
    fetch("/api/admin/listings/pending")
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(() => setListings([]));
  };

  useEffect(() => {
    load();
  }, []);

  const action = async (id: string, type: "approve" | "reject" | "flag") => {
    const res = await fetch(`/api/admin/listings/${id}/${type}`, { method: "POST" });
    if (res.ok) load();
    else {
      const data = await res.json();
      alert(data.error ?? "Failed");
    }
  };

  const imageUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${path}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">Pending listings</h1>
      <p className="mt-1 text-mowing-green/80">Approve or reject. Flag suspicious items.</p>
      <div className="mt-6 space-y-6">
        {listings.length === 0 ? (
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/80">
            No pending listings.
          </div>
        ) : (
          listings.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-par-3-punch/20 bg-white overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                <div className="flex gap-2 overflow-x-auto">
                  {l.listing_images?.slice(0, 3).map((img, i) => (
                    <img
                      key={i}
                      src={imageUrl(img.storage_path)}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg shrink-0"
                    />
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-mowing-green">{l.model}</p>
                  <p className="text-sm text-mowing-green/70">{l.category} · {l.brand} · {l.condition}</p>
                  <p className="font-semibold text-mowing-green mt-1">{formatPrice(l.price)}</p>
                  {l.description && (
                    <p className="text-sm text-mowing-green/80 mt-2 line-clamp-2">{l.description}</p>
                  )}
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
          ))
        )}
      </div>
    </div>
  );
}
