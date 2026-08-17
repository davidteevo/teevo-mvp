"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AvailabilityReconfirmForm } from "@/components/dashboard/AvailabilityReconfirmForm";

function ConfirmAvailabilityInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const listingId = params.get("listingId");
  const availableParam = params.get("available");
  const available =
    availableParam === "true" ? true : availableParam === "false" ? false : null;

  if (!token) {
    return (
      <p className="text-mowing-green/80">
        This confirmation link is missing. Please use the button in your Teevo email.
      </p>
    );
  }

  return (
    <AvailabilityReconfirmForm
      token={token}
      preload={{ listingId, available }}
    />
  );
}

export default function ConfirmAvailabilityPage() {
  return (
    <div className="min-h-screen bg-off-white-pique px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-bold text-mowing-green">Is it still available?</h1>
        <p className="text-sm text-mowing-green/80">
          Confirm whether you still have each item. This only takes a second and does not require you to
          log in.
        </p>
        <Suspense fallback={<p className="text-mowing-green/80">Loading…</p>}>
          <ConfirmAvailabilityInner />
        </Suspense>
      </div>
    </div>
  );
}
