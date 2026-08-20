import { FoundingSellerBadge } from "@/components/trust/FoundingSellerBadge";
import { Star } from "lucide-react";

export function FounderMembershipCard({
  rank,
  joinedAt,
}: {
  rank: number;
  joinedAt?: string | null;
}) {
  const year = joinedAt ? new Date(joinedAt).getFullYear() : new Date().getFullYear();
  const padded = String(rank).padStart(3, "0");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-golden-tee/40 bg-gradient-to-br from-mowing-green to-mowing-green/90 p-5 text-off-white-pique shadow-sm">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-golden-tee/20"
        aria-hidden
      />
      <p className="text-xs font-semibold tracking-[0.2em] text-golden-tee">TEEVO</p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-golden-tee">
        <Star className="h-4 w-4" aria-hidden />
        FOUNDING MEMBER
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">#{padded}</p>
      <p className="mt-3 text-xs text-off-white-pique/75">Member since {year}</p>
      <div className="mt-4">
        <FoundingSellerBadge rank={rank} />
      </div>
    </div>
  );
}
