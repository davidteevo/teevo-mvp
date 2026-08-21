"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Award, ArrowRight, MessageCircle, PoundSterling, Rocket, Star } from "lucide-react";
import { track } from "@/lib/analytics";
import { FOUNDER_EVENTS } from "@/lib/founder/types";

export type FounderCampaignClientProps = {
  claimed: number;
  remaining: number;
  limit: number;
  progressLabel: string;
  remainingLabel: string;
  milestoneMessage: string;
  socialProof: string | null;
  referrerFirstName: string | null;
};

function ProgressBar({ claimed, limit }: { claimed: number; limit: number }) {
  const pct = Math.max(0, Math.min(100, (claimed / Math.max(limit, 1)) * 100));
  return (
    <div
      className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-mowing-green/15"
      role="progressbar"
      aria-valuenow={claimed}
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-label={`${claimed} of ${limit} Founder spots claimed`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-mowing-green to-par-3-punch motion-safe:transition-[width] motion-safe:duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FounderHero({
  claimed,
  remaining,
  limit,
  progressLabel,
  remainingLabel,
  milestoneMessage,
  socialProof,
  referrerFirstName,
}: FounderCampaignClientProps) {
  useEffect(() => {
    track(FOUNDER_EVENTS.CAMPAIGN_VIEWED, {
      claimed,
      remaining,
      limit,
      has_referrer: Boolean(referrerFirstName),
    });
    track("browse_founder_cta_viewed", {
      claimed,
      remaining,
      limit,
      has_referrer: Boolean(referrerFirstName),
    });
  }, [claimed, remaining, limit, referrerFirstName]);

  const handleClaim = () => {
    track(FOUNDER_EVENTS.CLAIM_CLICKED, { claimed, remaining });
    track("browse_founder_cta_clicked", { claimed, remaining });
  };

  return (
    <header className="relative mb-8 overflow-hidden rounded-2xl border border-mowing-green/15 bg-gradient-to-br from-mowing-green/[0.08] via-off-white-pique to-golden-tee/20 px-5 py-8 sm:px-8 sm:py-10">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-par-3-punch/10 blur-2xl"
        aria-hidden
      />
      <div className="relative max-w-xl">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-golden-tee/90 px-2.5 py-1 text-xs font-semibold tracking-wide text-mowing-green">
          <Star className="h-3.5 w-3.5" aria-hidden />
          FIRST 100
        </p>

        {referrerFirstName ? (
          <>
            <p className="mt-4 text-sm font-medium text-mowing-green/80">You&apos;ve been invited to Teevo</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-mowing-green sm:text-3xl">
              {referrerFirstName} has invited you to join Teevo — and there are still {remaining} Founding
              Member {remaining === 1 ? "place" : "places"} available.
            </h1>
          </>
        ) : (
          <h1 className="mt-4 text-2xl font-bold leading-tight text-mowing-green sm:text-3xl">
            Become a Teevo Founding Member.
          </h1>
        )}

        <p className="mt-3 text-sm text-mowing-green/80 sm:text-base">
          We&apos;re giving our first 100 members permanent Founder status — and £5 Teevo credit when they
          list their first club.
        </p>

        <p className="mt-4 text-lg font-semibold text-mowing-green tabular-nums">{progressLabel}</p>
        <ProgressBar claimed={claimed} limit={limit} />
        <p className="mt-2 text-sm font-medium text-mowing-green/70">{milestoneMessage}</p>
        {claimed >= 90 && claimed < limit && (
          <p className="mt-1 text-sm font-semibold text-mowing-green">{remainingLabel}</p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            onClick={handleClaim}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-mowing-green px-5 py-3 text-base font-semibold text-off-white-pique hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mowing-green"
          >
            Claim my Founder spot
            <ArrowRight
              className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <p className="text-xs text-mowing-green/70 sm:text-sm">
            Takes around 30 seconds. No card required.
          </p>
        </div>
        {socialProof && <p className="mt-3 text-sm text-mowing-green/75">{socialProof}</p>}
      </div>
    </header>
  );
}

export function FounderBenefits() {
  const items = [
    {
      icon: Award,
      title: "Permanent Founder Status",
      body: "You're one of Teevo's first 100 members.",
    },
    {
      icon: PoundSterling,
      title: "£5 Teevo Credit",
      body: "List your first qualifying club and earn £5 Teevo credit.",
    },
    {
      icon: MessageCircle,
      title: "Shape Teevo",
      body: "Help influence what Teevo builds next.",
    },
    {
      icon: Rocket,
      title: "Early Access",
      body: "Get selected new Teevo features before wider release.",
    },
  ] as const;

  return (
    <section className="mb-10" aria-labelledby="founder-benefits-heading">
      <h2 id="founder-benefits-heading" className="text-xl font-bold text-mowing-green">
        Founder membership
      </h2>
      <p className="mt-1 text-sm text-mowing-green/75">What you get as one of the first 100.</p>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="rounded-xl border border-par-3-punch/20 bg-white/80 p-4 motion-safe:transition-shadow motion-safe:hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-golden-tee/40 p-2 text-mowing-green">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-mowing-green">{title}</p>
                <p className="mt-1 text-sm text-mowing-green/75">{body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FounderHowItWorks() {
  const steps = [
    { n: "1", title: "List your club", body: "Add your photos and club details." },
    { n: "2", title: "Someone buys", body: "Teevo handles the transaction securely." },
    { n: "3", title: "Ship it", body: "Follow Teevo's fulfilment workflow." },
    { n: "4", title: "Get paid", body: "Receive payment through Teevo's payout process." },
  ] as const;

  return (
    <section className="mb-10" aria-labelledby="founder-how-heading">
      <h2 id="founder-how-heading" className="text-xl font-bold text-mowing-green">
        Think Vinted. But golf.
      </h2>
      <p className="mt-1 text-sm text-mowing-green/75">Sell gear you no longer use — simply and securely.</p>
      <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map((s) => (
          <li key={s.n} className="rounded-xl border border-mowing-green/10 bg-mowing-green/[0.04] p-3">
            <span className="text-xs font-bold text-par-3-punch">{s.n}</span>
            <p className="mt-1 font-semibold text-mowing-green text-sm">{s.title}</p>
            <p className="mt-0.5 text-xs text-mowing-green/70">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FounderStickyCta({ claimed, remaining }: { claimed: number; remaining: number }) {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-mowing-green/15 bg-off-white-pique/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 safe-area-pb sm:hidden ${
          visible ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Link
          href="/signup"
          onClick={() => {
            track(FOUNDER_EVENTS.CLAIM_CLICKED, { claimed, remaining, sticky: true });
            track("browse_founder_cta_clicked", { claimed, remaining, sticky: true });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-mowing-green px-4 py-3 text-sm font-semibold text-off-white-pique"
        >
          <Star className="h-4 w-4" aria-hidden />
          Claim my Founder spot
        </Link>
      </div>
    </>
  );
}

export function FounderCampaignCompleteNote() {
  return (
    <p className="mb-6 text-center text-sm text-mowing-green/70">
      <span className="font-semibold text-mowing-green">100 Founding Members. One community.</span>
      {" "}
      Teevo&apos;s first 100 helped us get started.
    </p>
  );
}
