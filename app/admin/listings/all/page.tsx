"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

type Listing = {
  id: string;
  user_id: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  status: string;
  created_at: string;
  seller_email: string | null;
};

export default function AdminAllListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const search = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    fetch(`/api/admin/listings?${params}`)
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    search();
  }, []);

  const handleDelete = async (id: string, model: string) => {
    if (!confirm(`Permanently delete listing “${model}”? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/listings/${id}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      } else {
        alert(data.error ?? "Failed to delete");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-mowing-green">All listings</h1>
      <p className="mt-1 text-mowing-green/80">Search and delete listings. Listings with transactions cannot be deleted.</p>

      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-mowing-green/80 mb-1">Search</label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Model, brand, description…"
            className="rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green w-64 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green/80 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
        >
          {loading ? "Searching…" : "Search"}
        </button>
        <Link
          href="/admin/listings"
          className="text-sm text-mowing-green/80 hover:text-mowing-green"
        >
          Pending only →
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white overflow-hidden">
        {listings.length === 0 && !loading ? (
          <div className="p-8 text-center text-mowing-green/80">
            No listings match. Try changing search or status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-par-3-punch/20 bg-mowing-green/5 text-left text-mowing-green/80 font-medium">
                  <th className="p-3">Model</th>
                  <th className="p-3">Category · Brand</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Listed</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-par-3-punch/10 hover:bg-mowing-green/[0.03]">
                    <td className="p-3">
                      <Link href={`/admin/listings/${l.id}`} className="font-medium text-mowing-green hover:underline">
                        {l.model}
                      </Link>
                    </td>
                    <td className="p-3 text-mowing-green/80">{l.category} · {l.brand}</td>
                    <td className="p-3">{formatPrice(l.price)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.status === "pending" ? "bg-golden-tee/30" :
                        l.status === "verified" ? "bg-par-3-punch/30" :
                        l.status === "rejected" ? "bg-divot-pink/30" :
                        "bg-mowing-green/20"
                      } text-mowing-green`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 text-mowing-green/80">
                      {l.seller_email ? (
                        <a href={`mailto:${l.seller_email}`} className="hover:underline">{l.seller_email}</a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-mowing-green/70">
                      {new Date(l.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/listings/${l.id}`}
                        className="text-par-3-punch hover:underline mr-2"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(l.id, l.model)}
                        disabled={deletingId === l.id}
                        className="text-divot-pink hover:underline disabled:opacity-50"
                      >
                        {deletingId === l.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
