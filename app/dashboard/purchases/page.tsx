"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { highlightClass, useHighlightId } from "@/lib/use-highlight-id";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";
import { getListingImageUrl } from "@/lib/listing-images";
import { getTrackingNumber, getTrackingUrl } from "@/lib/fulfilment";
import { getBuyerOrderProgress } from "@/lib/buyer-order-progress";
import { BuyerOrderProgress } from "@/components/dashboard/BuyerOrderProgress";

type ListingImage = { storage_path: string; sort_order: number };

type Transaction = {
  id: string;
  listing_id: string;
  status: string;
  order_state?: string | null;
  fulfilment_status?: string | null;
  amount: number;
  created_at: string;
  shipped_at?: string | null;
  completed_at?: string | null;
  buyer_confirmed_at?: string | null;
  delivery_issue_reported_at?: string | null;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shippo_tracking_number?: string | null;
  seller_review_id?: string | null;
  listing?: {
    model: string;
    category: string;
    brand: string;
    listing_images?: ListingImage[] | null;
  } | null;
};

function firstImagePath(images: ListingImage[] | null | undefined): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.storage_path ?? null;
}

export default function DashboardPurchasesPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <DashboardPurchasesContent />
    </Suspense>
  );
}

function DashboardPurchasesContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const highlightId = useHighlightId("purchase", transactions.length > 0);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/dashboard/purchases")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = () => {
      fetch("/api/transactions?role=buyer")
        .then((r) => r.json())
        .then((data) => setTransactions(data.transactions ?? []))
        .catch(() => setTransactions([]));
    };
    fetchTransactions();
    window.addEventListener("focus", fetchTransactions);
    return () => window.removeEventListener("focus", fetchTransactions);
  }, [user]);

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const canOpenConfirm = (t: Transaction) => {
    if (t.status === "complete" || t.buyer_confirmed_at || t.completed_at || t.delivery_issue_reported_at) {
      return false;
    }
    return t.status === "shipped" || t.fulfilment_status === "DELIVERED" || t.order_state === "delivered";
  };

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Purchases</h1>
      <p className="mt-1 text-mowing-green/80">Track orders and confirm when you receive items.</p>
      <div className="mt-6 space-y-4">
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-par-3-punch/20 bg-white p-8 text-center text-mowing-green/80">
            No purchases yet.
          </div>
        ) : (
          transactions.map((t) => {
            const listing = t.listing;
            const imgPath = firstImagePath(listing?.listing_images);
            const imageUrl = imgPath ? getListingImageUrl(imgPath, "thumb") : "/placeholder-listing.svg";
            const subtitle = [listing?.category, listing?.brand].filter(Boolean).join(" · ") || null;
            const trackingNumber = getTrackingNumber(t);
            const trackingUrl = getTrackingUrl(t);
            const progress = getBuyerOrderProgress(t);
            const showTracking =
              progress.outcome === "progress" &&
              progress.currentIndex >= 2 &&
              !!(trackingNumber || trackingUrl || t.courier);
            const canConfirm = progress.outcome === "progress" && canOpenConfirm(t);
            const canLeaveFeedback =
              (t.status === "complete" || t.buyer_confirmed_at || t.completed_at) &&
              !t.delivery_issue_reported_at &&
              !t.seller_review_id;

            return (
              <article
                key={t.id}
                id={`purchase-${t.id}`}
                className={`rounded-xl border border-par-3-punch/20 bg-white p-4 sm:p-5${highlightClass(highlightId === t.id)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <Link
                    href={`/listing/${t.listing_id}`}
                    className="flex flex-1 min-w-0 gap-4 rounded-lg hover:bg-mowing-green/5 -m-2 p-2 transition-colors"
                  >
                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-mowing-green/10">
                      <Image
                        src={imageUrl}
                        alt={listing?.model ?? "Listing"}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-mowing-green truncate">
                        {listing?.model ?? "Item"}
                      </p>
                      {subtitle && (
                        <p className="text-sm text-mowing-green/70 truncate">{subtitle}</p>
                      )}
                      <p className="text-sm text-mowing-green/60 mt-0.5">
                        {formatPrice(t.amount)}
                        {progress.outcome === "progress" ? ` · ${progress.current.label}` : ""}
                      </p>
                      {t.created_at && (
                        <p className="text-xs text-mowing-green/50 mt-0.5">
                          Purchased {formatDateTime(t.created_at)}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0 sm:pt-2">
                    {canConfirm && (
                      <Link
                        href={`/dashboard/purchases/${t.id}/confirm`}
                        className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90"
                      >
                        Confirm delivery
                      </Link>
                    )}
                    {canLeaveFeedback && (
                      <Link
                        href={`/feedback/${t.id}`}
                        className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
                      >
                        Leave feedback
                      </Link>
                    )}
                    {t.seller_review_id && (
                      <Link
                        href={`/feedback/${t.id}`}
                        className="rounded-lg border border-par-3-punch/30 text-par-3-punch px-4 py-2 text-sm font-medium hover:bg-par-3-punch/10 transition-colors"
                      >
                        View feedback
                      </Link>
                    )}
                    <Link
                      href={`/listing/${t.listing_id}`}
                      className="rounded-lg border border-par-3-punch/30 text-par-3-punch px-4 py-2 text-sm font-medium hover:bg-par-3-punch/10 transition-colors"
                    >
                      View listing
                    </Link>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-par-3-punch/10">
                  <BuyerOrderProgress tx={t} />
                  {showTracking && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-mowing-green/80">
                      {t.courier && <span>Courier: {t.courier}</span>}
                      {trackingNumber && <span>Tracking: {trackingNumber}</span>}
                      {trackingUrl && (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-par-3-punch hover:underline"
                        >
                          Track Parcel
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
