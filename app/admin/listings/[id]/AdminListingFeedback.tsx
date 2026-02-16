"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const QUICK_COMMENTS = [
  "Please add more detail to the description.",
  "Please add more photos (we need 3–6 clear images).",
  "Please correct the errors and resubmit.",
];

export function AdminListingFeedback({
  listingId,
  initialFeedback,
}: {
  listingId: string;
  initialFeedback: string | null;
}) {
  const router = useRouter();
  const [comment, setComment] = useState(initialFeedback ?? "");
  const [saving, setSaving] = useState(false);

  const appendQuick = (text: string) => {
    setComment((prev) => (prev ? `${prev}\n\n${text}` : text));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment || null }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to save feedback");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-par-3-punch/20">
      <h2 className="text-sm font-semibold text-mowing-green/70 uppercase tracking-wide mb-2">
        Feedback for seller
      </h2>
      <p className="text-xs text-mowing-green/60 mb-2">
        The seller will see this in their dashboard. Use it to request more detail, photos, or corrections.
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {QUICK_COMMENTS.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => appendQuick(text)}
            className="rounded-lg border border-mowing-green/40 text-mowing-green px-3 py-1.5 text-xs font-medium hover:bg-mowing-green/10"
          >
            {text.slice(0, 25)}…
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="e.g. Add more detail, add more photos, correct errors…"
        rows={4}
        className="w-full rounded-lg border border-par-3-punch/20 bg-white px-3 py-2 text-mowing-green placeholder:text-mowing-green/50 text-sm"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-2 rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
      >
        {saving ? "Saving…" : "Save feedback"}
      </button>
    </div>
  );
}
