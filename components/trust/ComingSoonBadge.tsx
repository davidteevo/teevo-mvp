import { Clock } from "lucide-react";

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-golden-tee/90 text-mowing-green px-2 py-0.5 text-xs font-medium">
      <Clock className="h-3 w-3" aria-hidden />
      Coming Soon
    </span>
  );
}
