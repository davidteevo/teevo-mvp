import { Shield } from "lucide-react";

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-par-3-punch/90 text-white px-2 py-0.5 text-xs font-medium">
      <Shield className="h-3 w-3" aria-hidden />
      Verified
    </span>
  );
}
