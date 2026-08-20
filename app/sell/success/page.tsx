"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import { FOUNDER_EVENTS } from "@/lib/founder/types";

export default function SellSuccessPage() {
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rank = data?.profile?.founding_seller_rank;
        if (typeof rank === "number") {
          track(FOUNDER_EVENTS.LISTING_COMPLETED, { founder_number: rank });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-par-3-punch" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-mowing-green">
        Listing submitted
      </h1>
      <p className="mt-2 text-mowing-green/80">
        Your listing is live as Coming Soon. We&apos;ll let you know when it&apos;s ready for buyers to purchase.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/dashboard"
          className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-medium hover:opacity-90"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-mowing-green text-mowing-green px-6 py-3 font-medium hover:opacity-90"
        >
          Browse listings
        </Link>
      </div>
    </div>
  );
}
