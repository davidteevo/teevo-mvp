import { Award } from "lucide-react";

interface FoundingSellerBadgeProps {
  /** If provided (1–100), show "First 100 Founding Seller #42" */
  rank?: number | null;
}

export function FoundingSellerBadge({ rank }: FoundingSellerBadgeProps) {
  const label =
    rank != null && rank >= 1 && rank <= 100
      ? `First 100 Founding Seller #${rank}`
      : "First 100 Founding Seller";

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-golden-tee/90 text-mowing-green px-2 py-0.5 text-xs font-medium">
      <Award className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
