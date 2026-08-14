"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { FEEDBACK_EVENTS } from "@/lib/seller-reviews";
import { useEffect, useRef } from "react";

export function FeedbackAuthGate({ returnPath }: { returnPath: string }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track(FEEDBACK_EVENTS.AUTH_GATE_SHOWN, { return_path: returnPath });
  }, [returnPath]);

  const redirect = encodeURIComponent(returnPath);

  return (
    <div
      className="rounded-2xl bg-white border border-par-3-punch/20 shadow-sm max-w-md w-full p-6 text-mowing-green"
      role="dialog"
      aria-labelledby="feedback-auth-title"
    >
      <h2 id="feedback-auth-title" className="text-xl font-bold mb-2">
        See what buyers are saying
      </h2>
      <p className="text-mowing-green/80 text-sm mb-5">
        Create a Teevo account or log in to view seller feedback.
      </p>
      <div className="space-y-2">
        <Link
          href={`/signup?redirect=${redirect}`}
          className="block w-full rounded-xl bg-mowing-green text-off-white-pique px-4 py-3 text-center font-semibold hover:opacity-90"
        >
          Create account
        </Link>
        <Link
          href={`/login?redirect=${redirect}`}
          className="block w-full rounded-xl border-2 border-mowing-green text-mowing-green px-4 py-3 text-center font-semibold hover:bg-mowing-green/10"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
