"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

export function ReducePriceControl({
  listingId,
  currentPricePence,
  onUpdated,
  compact = false,
  refreshOnSuccess = false,
}: {
  listingId: string;
  currentPricePence: number;
  onUpdated?: (newPricePence: number) => void;
  compact?: boolean;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState((currentPricePence / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const pounds = parseFloat(value);
    if (Number.isNaN(pounds) || pounds <= 0) {
      setError("Enter a valid price.");
      return;
    }
    const pricePence = Math.round(pounds * 100);
    if (pricePence >= currentPricePence) {
      setError("New price must be lower than the current price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/reduce-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: pricePence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to reduce price");
        return;
      }
      setOpen(false);
      onUpdated?.(data.price ?? pricePence);
      if (refreshOnSuccess) router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue((currentPricePence / 100).toFixed(2));
          setError("");
          setOpen(true);
        }}
        className={
          compact
            ? "text-sm text-par-3-punch hover:underline"
            : "rounded-lg border border-mowing-green/40 text-mowing-green px-3 py-1.5 text-sm font-medium hover:bg-mowing-green/5"
        }
      >
        Reduce price
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <p className="text-xs text-mowing-green/70">Current: {formatPrice(currentPricePence)}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-mowing-green">£</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          className="w-24 rounded-lg border border-mowing-green/30 bg-white px-2 py-1.5 text-sm text-mowing-green"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className="text-sm text-mowing-green/70 hover:underline"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-divot-pink">{error}</p>}
    </div>
  );
}
