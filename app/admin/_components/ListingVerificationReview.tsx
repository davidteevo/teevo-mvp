"use client";

import { useState } from "react";
import { ListingImageGallery } from "@/app/listing/[id]/ListingImageGallery";
import { formatPrice } from "@/lib/format";
import type { ListingVerificationDetail } from "@/lib/admin-action-centre-data";
import { readActionResponse } from "./actionResult";
import { ClubDetailsTable } from "@/components/listing/ClubDetailsDisplay";
import type { Listing } from "@/types/database";

const QUICK_COMMENTS = [
  "Please add more detail to the description.",
  "Please add more photos (we need 3–6 clear images).",
  "Please correct the errors and resubmit.",
];

export function ListingVerificationReview({
  detail,
  onSuccess,
  onAlreadyProcessed,
}: {
  detail: ListingVerificationDetail;
  onSuccess: (message: string, opts?: { keepInQueue?: boolean }) => void;
  onAlreadyProcessed: () => void;
}) {
  const listing = detail.listing;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState(listing.admin_feedback ?? "");

  const run = async (type: "approve" | "reject" | "feedback") => {
    if (type === "feedback" && !comment.trim()) {
      setError("Add a comment to request changes.");
      return;
    }
    setBusy(type);
    setError(null);
    try {
      const res =
        type === "feedback"
          ? await fetch(`/api/admin/listings/${listing.id}/feedback`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ comment: comment.trim() }),
            })
          : await fetch(`/api/admin/listings/${listing.id}/${type}`, { method: "POST" });
      const result = await readActionResponse(res);
      if (result.ok) {
        if (type === "approve") onSuccess("Listing approved ✓");
        else if (type === "reject") onSuccess("Listing rejected ✓");
        else onSuccess("Changes requested ✓", { keepInQueue: true });
        return;
      }
      if (result.alreadyProcessed) onAlreadyProcessed();
      else setError(result.message);
    } finally {
      setBusy(null);
    }
  };

  const structuredMeta = [listing.item_type?.trim(), listing.size?.trim(), listing.colour?.trim()].filter(
    Boolean
  ) as string[];

  return (
    <div className="space-y-6">
      {listing.imageUrls.length > 0 ? (
        <ListingImageGallery imageUrls={listing.imageUrls} alt={listing.displayTitle} listingStatus={listing.status} />
      ) : (
        <div className="aspect-square rounded-xl bg-mowing-green/5 flex items-center justify-center text-mowing-green/50">
          No image
        </div>
      )}

      <div>
        <p className="text-sm text-mowing-green/70 uppercase tracking-wide">
          {listing.category} · {listing.brand}
        </p>
        <h3 className="text-xl font-bold text-mowing-green mt-1">{listing.displayTitle}</h3>
        <p className="text-mowing-green/80 mt-1">
          {listing.condition}
          {listing.handed && ` · ${listing.handed === "left" ? "Left" : "Right"} handed`}
        </p>
        {structuredMeta.length > 0 && (
          <p className="mt-1 text-sm text-mowing-green/80">{structuredMeta.join(" · ")}</p>
        )}
        <ClubDetailsTable listing={listing as unknown as Listing} />
        <p className="mt-3 text-xl font-bold text-mowing-green">{formatPrice(listing.price)}</p>
      </div>

      {detail.seller && (
        <div className="rounded-lg border border-par-3-punch/15 bg-mowing-green/5 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/70">Seller</p>
          <p className="mt-1 text-mowing-green">{detail.seller.name}</p>
          {detail.seller.email && (
            <a href={`mailto:${detail.seller.email}`} className="text-par-3-punch hover:underline">
              {detail.seller.email}
            </a>
          )}
        </div>
      )}

      {listing.description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/70">Description</p>
          <p className="mt-1 text-sm text-mowing-green/90 whitespace-pre-wrap">{listing.description}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-mowing-green/70 mb-2">Request changes</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {QUICK_COMMENTS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setComment((prev) => (prev ? `${prev}\n\n${text}` : text))}
              className="rounded-lg border border-mowing-green/40 text-mowing-green px-3 py-1.5 text-xs font-medium hover:bg-mowing-green/10"
            >
              {text.slice(0, 28)}…
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Tell the seller what to change…"
          className="w-full rounded-lg border border-par-3-punch/20 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-divot-pink" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("approve")}
          className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {busy === "approve" ? "Approving…" : "Approve listing"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("feedback")}
          className="rounded-lg border border-mowing-green/40 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/10 disabled:opacity-60"
        >
          {busy === "feedback" ? "Saving…" : "Request changes"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("reject")}
          className="rounded-lg border border-divot-pink text-divot-pink px-4 py-2 text-sm font-medium hover:bg-divot-pink/10 disabled:opacity-60"
        >
          {busy === "reject" ? "Rejecting…" : "Reject listing"}
        </button>
      </div>
    </div>
  );
}
