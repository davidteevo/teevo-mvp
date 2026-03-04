"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ShippingService, type ShippingServiceType } from "@/lib/shippo";
import { SHIPPING_FEE_GBP } from "@/lib/fulfilment";

const DELIVERY_OPTIONS: { value: ShippingServiceType; label: string }[] = [
  { value: ShippingService.DPD_NEXT_DAY, label: `DPD Next Day · £${SHIPPING_FEE_GBP.toFixed(2)}` },
  { value: ShippingService.DPD_SHIP_TO_SHOP, label: `DPD Ship to Shop · £${SHIPPING_FEE_GBP.toFixed(2)}` },
];

const BUYING_ENABLED = process.env.NEXT_PUBLIC_BUYING_ENABLED !== "false";

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

  const [modalOpen, setModalOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      const url = data.url;
      if (!url || typeof url !== "string") {
        alert("Checkout could not be started. Please try again.");
        return;
      }
      window.location.href = url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const openNotifyModal = () => {
    setModalOpen(true);
    setNotifySuccess(false);
    setNotifyError(null);
    setNotifyEmail(user?.email ?? "");
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = notifyEmail.trim();
    if (!email) {
      setNotifyError("Please enter your email.");
      return;
    }
    setNotifyLoading(true);
    setNotifyError(null);
    try {
      const res = await fetch("/api/notify-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotifyError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setNotifySuccess(true);
    } catch {
      setNotifyError("Something went wrong. Please try again.");
    } finally {
      setNotifyLoading(false);
    }
  };

  if (!BUYING_ENABLED) {
    return (
      <>
        <div className="space-y-3">
          <button
            type="button"
            onClick={openNotifyModal}
            title="Buying will open shortly while we finalise secure shipping and payments."
            className="w-full sm:w-auto rounded-xl bg-mowing-green text-off-white-pique px-8 py-4 text-lg font-semibold hover:opacity-90"
          >
            Coming Soon
          </button>
        </div>

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notify-modal-title"
          >
            <div
              className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 text-mowing-green"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="notify-modal-title" className="text-xl font-bold">
                Buying launches soon
              </h2>
              {notifySuccess ? (
                <p className="mt-4 text-mowing-green/90">
                  Thanks — we&apos;ll email you when buying opens.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="mt-6 w-full rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 font-semibold hover:opacity-90"
                >
                  Close
                </button>
              ) : (
                <>
                  <p className="mt-2 text-mowing-green/80">
                    We&apos;re finalising secure shipping. Enter your email and we&apos;ll notify you when this item becomes available.
                  </p>
                  <form onSubmit={handleNotifySubmit} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="notify-email" className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <input
                        id="notify-email"
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
                        autoComplete="email"
                        disabled={notifyLoading}
                      />
                    </div>
                    {notifyError && (
                      <p className="text-sm text-red-600" role="alert">
                        {notifyError}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="flex-1 rounded-xl border border-mowing-green/30 text-mowing-green px-4 py-3 font-medium hover:bg-mowing-green/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={notifyLoading}
                        className="flex-1 rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 font-semibold hover:opacity-90 disabled:opacity-70"
                      >
                        {notifyLoading ? "Saving…" : "Notify me when buying opens"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  if (!sellerCanAcceptPayment) {
    return (
      <div className="rounded-xl border border-par-3-punch/40 bg-par-3-punch/10 px-4 py-3 text-mowing-green/90 text-sm">
        <p className="font-medium">Not available to buy yet</p>
        <p className="mt-0.5">This seller hasn&apos;t set up payments. Check back soon.</p>
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
        {loading ? "Opening…" : `Buy now · £${((totalPence ?? price) / 100).toFixed(2)}`}
      </button>
    </div>
  );
}
