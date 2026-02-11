"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function BuyButton({
  listingId,
  price,
}: {
  listingId: string;
  price: number;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={loading}
      className="w-full sm:w-auto rounded-xl bg-mowing-green text-off-white-pique px-8 py-4 text-lg font-semibold hover:opacity-90 disabled:opacity-70"
    >
      {loading ? "Redirecting…" : `Buy now · £${(price / 100).toFixed(2)}`}
    </button>
  );
}
