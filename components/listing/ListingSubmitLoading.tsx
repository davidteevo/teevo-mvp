"use client";

export type ListingSubmitProgress = { current: number; total: number };

interface ListingSubmitLoadingProps {
  progress?: ListingSubmitProgress | null;
}

export function ListingSubmitLoading({ progress }: ListingSubmitLoadingProps) {
  const computed =
    progress && progress.total > 0
      ? Math.round((100 * progress.current) / progress.total)
      : 0;
  const pct = Math.min(100, Math.max(8, computed || 8));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      role="status"
      aria-live="polite"
      aria-label="Getting your listing ready"
    >
      <div className="w-full max-w-sm rounded-2xl bg-mowing-green p-6 text-center shadow-xl">
        <p className="text-lg font-semibold text-off-white-pique">Getting your listing ready...</p>
        <p className="mt-1.5 text-sm text-off-white-pique/70">
          Just a moment while Teevo prepares your listing.
        </p>
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-par-3-punch transition-all duration-300"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
