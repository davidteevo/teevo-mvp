"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminListingActions({
  listingId,
  status,
  buyingPaused,
  availabilityStatus,
  availabilitySource,
  availabilityRequestedAt,
  availabilityConfirmedAt,
  batchId,
  emailError,
  hasOpenOrder,
}: {
  listingId: string;
  status: string;
  buyingPaused?: boolean;
  availabilityStatus?: string | null;
  availabilitySource?: string | null;
  availabilityRequestedAt?: string | null;
  availabilityConfirmedAt?: string | null;
  batchId?: string | null;
  emailError?: string | null;
  hasOpenOrder?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const action = async (type: "approve" | "reject" | "flag") => {
    setLoading(type);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/${type}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push("/admin/listings");
        router.refresh();
      } else {
        setError(data.error ?? "Failed");
      }
    } finally {
      setLoading(null);
    }
  };

  const pause = async (paused: boolean) => {
    setLoading(paused ? "pause" : "resume");
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const reconfirm = async () => {
    if (
      !confirm(
        "Request availability confirmation? Purchasing will be disabled until the seller responds, and they will be emailed."
      )
    ) {
      return;
    }
    setLoading("reconfirm");
    setError(null);
    try {
      const res = await fetch("/api/admin/listings/availability/reconfirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds: [listingId] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not request confirmation");
        return;
      }
      if (data.skipped?.length) {
        setError("This listing cannot be reconfirmed right now (active order or already in progress).");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const resend = async () => {
    if (!batchId) return;
    setLoading("resend");
    setError(null);
    try {
      const res = await fetch("/api/admin/listings/availability/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not resend");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const formatDay = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const awaiting = availabilityStatus === "required" && availabilitySource === "admin_reconfirm";
  const dispatchTimeoutRequired =
    availabilityStatus === "required" && availabilitySource === "dispatch_timeout";
  const canPause = status !== "sold" && !hasOpenOrder;
  const canReconfirm =
    status === "verified" && !hasOpenOrder && !awaiting && !dispatchTimeoutRequired;

  return (
    <div className="space-y-4">
      {status === "pending" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => action("approve")}
            disabled={!!loading}
            className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => action("reject")}
            disabled={!!loading}
            className="rounded-lg border border-divot-pink text-divot-pink px-4 py-2 text-sm font-medium hover:bg-divot-pink/10 disabled:opacity-70"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => action("flag")}
            disabled={!!loading}
            className="rounded-lg border border-mowing-green/50 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/5 disabled:opacity-70"
          >
            Flag
          </button>
        </div>
      )}

      <div className="rounded-lg border border-par-3-punch/20 bg-mowing-green/5 p-3 space-y-2">
        <h3 className="text-sm font-semibold text-mowing-green">Availability</h3>
        <p className="text-sm text-mowing-green/80">
          Buying: <span className="font-medium">{buyingPaused ? "Paused" : "Enabled"}</span>
        </p>
        <p className="text-sm text-mowing-green/80">
          Status:{" "}
          <span className="font-medium">
            {availabilityStatus === "required"
              ? "Awaiting seller confirmation"
              : availabilityStatus === "confirmed_available"
                ? "Confirmed"
                : availabilityStatus === "confirmed_unavailable"
                  ? "Seller says unavailable"
                  : availabilityStatus === "expired"
                    ? "Confirmation expired"
                    : "Never requested"}
          </span>
        </p>
        {formatDay(availabilityRequestedAt) && (
          <p className="text-xs text-mowing-green/60">Requested {formatDay(availabilityRequestedAt)}</p>
        )}
        {formatDay(availabilityConfirmedAt) && (
          <p className="text-xs text-mowing-green/60">Last confirmed {formatDay(availabilityConfirmedAt)}</p>
        )}
        {emailError && (
          <p className="text-xs text-divot-pink">Email failed: {emailError}</p>
        )}
        {hasOpenOrder && (
          <p className="text-xs text-mowing-green/70">
            This listing has an active order, so pause and reconfirm are unavailable.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {canPause && (
            <button
              type="button"
              onClick={() => pause(!buyingPaused)}
              disabled={!!loading}
              className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-60"
            >
              {loading === "pause" || loading === "resume"
                ? "Saving…"
                : buyingPaused
                  ? "Resume buying"
                  : "Pause buying"}
            </button>
          )}
          {canReconfirm && (
            <button
              type="button"
              onClick={reconfirm}
              disabled={!!loading}
              className="rounded-lg bg-mowing-green text-off-white-pique px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {loading === "reconfirm" ? "Requesting…" : "Reconfirm availability"}
            </button>
          )}
          {awaiting && batchId && (
            <button
              type="button"
              onClick={resend}
              disabled={!!loading}
              className="rounded-lg border border-mowing-green/20 px-3 py-1.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-60"
            >
              {loading === "resend" ? "Sending…" : "Resend confirmation email"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-divot-pink">{error}</p>}
    </div>
  );
}
