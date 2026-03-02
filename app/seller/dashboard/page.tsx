"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";

type Listing = {
  id: string;
  category: string;
  brand: string;
  model: string;
  title?: string | null;
  condition: string;
  price: number;
  status: string;
  created_at: string;
  admin_feedback?: string | null;
  listing_images?: { storage_path: string; sort_order: number }[];
};

export default function SellerDashboardPage() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const edited = searchParams.get("edited") === "1";

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/seller/dashboard")}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchListings = () => {
      fetch("/api/listings/mine")
        .then((r) => r.json())
        .then((data) => setListings(data.listings ?? []))
        .catch(() => setListings([]));
    };
    fetchListings();
    window.addEventListener("focus", fetchListings);
    return () => window.removeEventListener("focus", fetchListings);
  }, [user]);

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  const statusLabel = (status: string) => {
    if (status === "pending") return "Pending review";
    if (status === "verified") return "Live";
    if (status === "rejected") return "Rejected";
    if (status === "sold") return "Sold";
    return status;
  };

  const statusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-golden-tee/30 text-mowing-green",
      verified: "bg-par-3-punch/30 text-mowing-green",
      rejected: "bg-divot-pink/30 text-mowing-green",
      sold: "bg-mowing-green/20 text-mowing-green",
    };
    return map[status] ?? "bg-mowing-green/10 text-mowing-green";
  };

  const whatsappUrl = process.env.NEXT_PUBLIC_SELLER_WHATSAPP_URL;
  const bookCallUrl = process.env.NEXT_PUBLIC_BOOK_CALL_URL;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Seller dashboard</h1>
      <p className="mt-1 text-mowing-green/80 text-sm">
        Manage your listings and stay in the loop.
      </p>

      {edited && (
        <div className="mt-4 rounded-xl border border-par-3-punch/30 bg-par-3-punch/5 p-4 text-sm text-mowing-green">
          Changes saved. We&apos;ll review again and get back to you.
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/sell/start"
          className="rounded-xl bg-mowing-green text-off-white-pique px-5 py-2.5 font-medium hover:opacity-90"
        >
          Add new listing
        </Link>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-mowing-green text-mowing-green px-5 py-2.5 font-medium hover:bg-mowing-green/5"
          >
            Join Founding Sellers WhatsApp
          </a>
        )}
        {bookCallUrl && (
          <a
            href={bookCallUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-mowing-green/60 text-mowing-green px-5 py-2.5 font-medium hover:bg-mowing-green/5"
          >
            Book 15-min call
          </a>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-mowing-green">Your listings</h2>
        {listings.length === 0 ? (
          <div className="mt-4 rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/80">
            <p>You haven&apos;t listed anything yet.</p>
            <Link href="/sell/start" className="mt-2 inline-block text-par-3-punch font-medium hover:underline">
              List your first item
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => {
              const displayTitle = l.title?.trim() || `${l.brand} ${l.model}`.trim() || l.category;
              const firstImg = l.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0];
              const imgUrl = firstImg && process.env.NEXT_PUBLIC_SUPABASE_URL
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${firstImg.storage_path}`
                : null;
              return (
                <li
                  key={l.id}
                  className="rounded-xl border border-par-3-punch/20 bg-white overflow-hidden"
                >
                  <div className="flex gap-3 p-3">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-mowing-green/10 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-mowing-green truncate">{displayTitle}</p>
                      <p className="text-sm text-mowing-green/80">{formatPrice(l.price)}</p>
                      <span
                        className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(l.status)}`}
                      >
                        {statusLabel(l.status)}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-par-3-punch/10 px-3 py-2 flex gap-2">
                    <Link
                      href={`/listing/${l.id}`}
                      className="text-sm text-par-3-punch hover:underline"
                    >
                      View
                    </Link>
                    {l.status === "pending" && (
                      <Link
                        href={`/sell/edit/${l.id}`}
                        className="text-sm text-mowing-green font-medium hover:underline"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
