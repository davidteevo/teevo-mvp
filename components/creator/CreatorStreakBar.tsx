"use client";

type Props = {
  current: number;
  target: number;
  remaining: number;
};

export function CreatorStreakBar({ current, target, remaining }: Props) {
  const pct = Math.min(100, Math.round((current / Math.max(target, 1)) * 100));

  return (
    <section className="rounded-2xl border border-par-3-punch/20 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-mowing-green">This month</h2>
      <p className="mt-2 text-sm text-mowing-green/80">
        <strong className="text-mowing-green">{current}</strong> successful referral
        {current === 1 ? "" : "s"}
      </p>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-mowing-green/10"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`${current} of ${target} referrals this month`}
      >
        <div
          className="h-full rounded-full bg-par-3-punch transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-semibold text-mowing-green">
        {current} / {target}
      </p>
      {remaining > 0 ? (
        <p className="mt-1 text-sm text-mowing-green/80">
          {remaining} more to hit {target} this month <span aria-hidden>🔥</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-mowing-green/80">
          You&apos;ve hit this month&apos;s milestone <span aria-hidden>🔥</span>
        </p>
      )}
    </section>
  );
}
