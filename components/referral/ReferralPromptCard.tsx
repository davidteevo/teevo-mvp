"use client";

import Link from "next/link";
import { ReferralShareActions } from "@/components/referral/ReferralShareActions";

export function ReferralPromptCard({
  title,
  body,
  cta,
  url,
  variant = "buyer",
}: {
  title: string;
  body: string;
  cta: string;
  url: string | null;
  variant?: "buyer" | "seller";
}) {
  return (
    <div className="mt-6 rounded-xl border border-par-3-punch/20 bg-white p-5">
      <h2 className="text-lg font-bold text-mowing-green">{title}</h2>
      <p className="mt-2 text-sm text-mowing-green/80">{body}</p>
      {url ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-mowing-green mb-2">{cta}</p>
          <ReferralShareActions url={url} variant={variant} />
        </div>
      ) : (
        <Link
          href="/dashboard/referrals"
          className="mt-4 inline-flex rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
