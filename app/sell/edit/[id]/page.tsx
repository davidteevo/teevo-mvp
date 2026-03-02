"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const CATEGORIES = ["Driver", "Woods", "Irons", "Wedges", "Putter", "Apparel", "Bag"];
const CONDITIONS = ["New", "Excellent", "Good", "Fair", "Used"];

type Listing = {
  id: string;
  category: string;
  brand: string;
  model: string;
  title?: string | null;
  condition: string;
  description: string | null;
  price: number;
  status: string;
  admin_feedback?: string | null;
};

export default function SellEditPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    fetch("/api/listings/mine")
      .then((res) => res.json())
      .then((data) => {
        const list = data.listings as Listing[] | undefined;
        const found = list?.find((l) => l.id === id) ?? null;
        if (found) {
          setListing(found);
          setTitle(found.title?.trim() || `${found.brand} ${found.model}`.trim());
          setCategory(found.category);
          setCondition(found.condition);
          setDescription(found.description || "");
          setPrice((found.price / 100).toFixed(2));
        } else {
          setFetchError("Listing not found or you don’t have permission to edit it.");
        }
      })
      .catch(() => setFetchError("Failed to load listing."));
  }, [user, id]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent(`/sell/edit/${id}`)}`);
    return null;
  }

  if (fetchError || (listing && listing.status !== "pending")) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-mowing-green/80">
          {fetchError || "This listing can’t be edited."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/seller/dashboard")}
          className="mt-4 rounded-xl bg-mowing-green text-off-white-pique px-6 py-2 font-medium hover:opacity-90"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading listing…
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const pricePence = Math.round(parseFloat(price) * 100);
    if (Number.isNaN(pricePence) || pricePence <= 0) {
      setMessage("Please enter a valid price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          category,
          brand: "Other",
          model: title.trim().slice(0, 500),
          condition,
          description: description.trim() || null,
          price: pricePence,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save.");
        setSaving(false);
        return;
      }
      router.push("/dashboard?edited=1");
    } catch {
      setMessage("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Edit listing</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Changes saved will be reviewed again before going live.
      </p>

      {listing.admin_feedback && (
        <div className="mt-4 rounded-xl border border-par-3-punch/30 bg-par-3-punch/5 p-4">
          <p className="text-sm font-medium text-mowing-green">Feedback from our team</p>
          <p className="mt-1 text-sm text-mowing-green/90 whitespace-pre-wrap">
            {listing.admin_feedback}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {message && (
          <p className="text-sm text-divot-pink" role="alert">
            {message}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brand + Model + Loft/Size"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Category *
          </label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Condition *
          </label>
          <select
            required
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-mowing-green mb-1">
            Price (£) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
