import Link from "next/link";
import { formatRatingAverage } from "@/lib/seller-reviews";

export function SellerRatingBadge({
  sellerId,
  average,
  count,
  name,
  compact = false,
}: {
  sellerId: string;
  average: number | null | undefined;
  count: number | null | undefined;
  name?: string | null;
  compact?: boolean;
}) {
  const n = count ?? 0;
  const display = formatRatingAverage(average);
  const href = `/seller/${encodeURIComponent(sellerId)}`;

  if (n <= 0 || !display) {
    if (compact) return null;
    return (
      <span className="text-sm text-mowing-green/70">No feedback yet</span>
    );
  }

  const label = `${display} ★ (${n} review${n === 1 ? "" : "s"})`;

  return (
    <Link
      href={href}
      className={
        compact
          ? "text-[10px] sm:text-xs text-mowing-green/70 hover:text-mowing-green hover:underline"
          : "text-sm font-medium text-mowing-green hover:underline"
      }
      onClick={(e) => e.stopPropagation()}
    >
      {name ? `${name} · ${label}` : label}
    </Link>
  );
}
