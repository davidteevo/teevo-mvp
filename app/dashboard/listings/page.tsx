"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";

type Listing = {
  id: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  status: string;
  created_at: string;
  admin_feedback?: string | null;
};

export default function DashboardListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent("/dashboard/listings")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/listings/mine")
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(() => setListings([]));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  const formatListedAt = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-GB", {
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

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-golden-tee/30 text-mowing-green",
      verified: "bg-par-3-punch/30 text-mowing-green",
      rejected: "bg-divot-pink/30 text-mowing-green",
      sold: "bg-mowing-green/20 text-mowing-green",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mowing-green">My listings</h1>
        <Link
          href="/sell"
          className="rounded-xl bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          New listing
        </Link>
      </div>
      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {listings.length === 0 ? (
          <div className="p-8 text-center text-mowing-green/80">
            <p>You haven’t listed anything yet.</p>
            <Link href="/sell" className="mt-2 inline-block text-par-3-punch hover:underline">
              List your first item
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-par-3-punch/10">
            {listings.map((l) => (
              <li key={l.id} className="p-4">
                <Link
                  href={`/listing/${l.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg hover:bg-mowing-green/5 -m-2 p-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-mowing-green">{l.model}</p>
                    <p className="text-sm text-mowing-green/70">{l.category} · {l.brand}</p>
                    {l.created_at && (
                      <p className="text-xs text-mowing-green/50 mt-0.5">
                        Listed {formatListedAt(l.created_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-mowing-green">{formatPrice(l.price)}</span>
                    {statusBadge(l.status)}
                    <span className="text-sm text-par-3-punch">View</span>
                  </div>
                </Link>
                {l.admin_feedback && (l.status === "pending" || l.status === "rejected") && (
                  <div className="mt-2 rounded-lg bg-golden-tee/20 border border-golden-tee/30 px-3 py-2 text-sm text-mowing-green/90">
                    <p className="font-medium text-mowing-green/80 mb-0.5">Feedback from reviewer</p>
                    <p className="whitespace-pre-wrap">{l.admin_feedback}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
