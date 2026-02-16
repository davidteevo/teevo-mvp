"use client";

import { Suspense } from "react";
import { PayoutsContent } from "./PayoutsContent";

export default function OnboardingPayoutsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 text-center text-mowing-green/80">
          <div className="h-10 w-10 rounded-full border-2 border-mowing-green/20 border-t-mowing-green animate-spin mx-auto" />
          <p className="mt-4">Loading payouts…</p>
        </div>
      }
    >
      <PayoutsContent />
    </Suspense>
  );
}
