"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ShippingService, type ShippingServiceType } from "@/lib/shippo";
import { SHIPPING_FEE_GBP } from "@/lib/fulfilment";

const DELIVERY_OPTIONS: { value: ShippingServiceType; label: string }[] = [
  { value: ShippingService.DPD_NEXT_DAY, label: `DPD Next Day · £${SHIPPING_FEE_GBP.toFixed(2)}` },
  { value: ShippingService.DPD_SHIP_TO_SHOP, label: `DPD Ship to Shop · £${SHIPPING_FEE_GBP.toFixed(2)}` },
];

export function BuyButton({
  listingId,
  price,
  totalPence,
  sellerCanAcceptPayment = true,
}: {
  listingId: string;
  price: number;
  totalPence?: number;
  /** False when the seller has not completed Stripe Connect payouts setup */
  sellerCanAcceptPayment?: boolean;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deliveryService, setDeliveryService] = useState<ShippingServiceType>(ShippingService.DPD_NEXT_DAY);

  const handleBuy = async () => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, shippingService: deliveryService }),
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

  if (!sellerCanAcceptPayment) {
    return (
      <div className="rounded-xl border border-par-3-punch/40 bg-par-3-punch/10 px-4 py-3 text-mowing-green/90 text-sm">
        <p className="font-medium">Not available to buy yet</p>
        <p className="mt-0.5">This seller hasn’t set up payments. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="delivery" className="block text-sm font-medium text-mowing-green mb-1">
          Delivery
        </label>
        <select
          id="delivery"
          value={deliveryService}
          onChange={(e) => setDeliveryService(e.target.value as ShippingServiceType)}
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
        >
          {DELIVERY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="w-full sm:w-auto rounded-xl bg-mowing-green text-off-white-pique px-8 py-4 text-lg font-semibold hover:opacity-90 disabled:opacity-70"
      >
        {loading ? "Redirecting…" : `Buy now · £${((totalPence ?? price) / 100).toFixed(2)}`}
      </button>
    </div>
  );
}
