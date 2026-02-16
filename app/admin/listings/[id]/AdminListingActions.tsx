"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const action = async (type: "approve" | "reject" | "flag") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/${type}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push("/admin/listings");
        router.refresh();
      } else {
        alert(data.error ?? "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (status !== "pending") {
    return (
      <p className="text-sm text-mowing-green/60">
        No actions (status: {status})
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => action("approve")}
        disabled={loading}
        className="rounded-lg bg-par-3-punch text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => action("reject")}
        disabled={loading}
        className="rounded-lg border border-divot-pink text-divot-pink px-4 py-2 text-sm font-medium hover:bg-divot-pink/10 disabled:opacity-70"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() => action("flag")}
        disabled={loading}
        className="rounded-lg border border-mowing-green/50 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-mowing-green/5 disabled:opacity-70"
      >
        Flag
      </button>
    </div>
  );
}
