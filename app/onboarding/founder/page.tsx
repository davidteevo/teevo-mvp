"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FoundingSellerBadge } from "@/components/trust/FoundingSellerBadge";
import { ArrowRight } from "lucide-react";

function FounderWelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const rankParam = searchParams.get("rank");
  const rankFromQuery = rankParam ? parseInt(rankParam, 10) : NaN;
  const rank =
    profile?.founding_seller_rank ??
    (Number.isFinite(rankFromQuery) ? rankFromQuery : null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/onboarding/founder")}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(true);
      return;
    }
    const t = window.setTimeout(() => setRevealed(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  if (authLoading || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-mowing-green/80">
        <div className="h-10 w-10 rounded-full border-2 border-mowing-green/20 border-t-mowing-green animate-spin mx-auto" />
        <p className="mt-4">Loading…</p>
      </div>
    );
  }

  const displayRank = rank != null && rank >= 1 && rank <= 100 ? rank : null;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-golden-tee/40 bg-gradient-to-b from-golden-tee/20 to-white p-6 shadow-sm text-center">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <h1 className="mt-3 text-2xl font-bold text-mowing-green">You&apos;re in.</h1>
        {displayRank != null && (
          <div
            className={`mt-4 motion-safe:transition-all motion-safe:duration-500 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <p className="text-sm text-mowing-green/70">Founding Member</p>
            <p className="text-3xl font-bold tabular-nums text-mowing-green">
              #{String(displayRank).padStart(3, "0")}
            </p>
            <div className="mt-3 flex justify-center">
              <FoundingSellerBadge rank={displayRank} />
            </div>
          </div>
        )}
        <p className="mt-4 text-sm text-mowing-green/80">
          You&apos;re officially one of the first 100 members of Teevo.
        </p>

        <div className="mt-8 rounded-xl border border-mowing-green/15 bg-mowing-green/5 p-4 text-left">
          <h2 className="font-semibold text-mowing-green">Your £5 is waiting.</h2>
          <p className="mt-1 text-sm text-mowing-green/75">
            List your first eligible club and we&apos;ll add £5 Teevo credit to your account.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/sell"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-mowing-green px-5 py-3 font-semibold text-off-white-pique hover:opacity-95"
          >
            List my first club
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/onboarding/welcome?new=1"
            className="text-sm font-medium text-mowing-green/80 hover:underline"
          >
            Continue setup
          </Link>
          <Link href="/" className="text-sm text-mowing-green/60 hover:underline">
            Browse Teevo
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FounderOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 text-center text-mowing-green/80">Loading…</div>
      }
    >
      <FounderWelcomeContent />
    </Suspense>
  );
}
