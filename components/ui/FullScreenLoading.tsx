"use client";

interface FullScreenLoadingProps {
  title: string;
  subtitle: string;
  ariaLabel?: string;
  className?: string;
}

export function FullScreenLoading({ title, subtitle, ariaLabel, className }: FullScreenLoadingProps) {
  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center bg-off-white-pique ${className ?? "z-50"}`}
      aria-live="polite"
      role="status"
      aria-label={ariaLabel ?? title}
    >
      <div className="flex flex-col items-center">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-mowing-green/15" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-mowing-green border-r-mowing-green/40 animate-spin"
            style={{ animationDuration: "0.9s" }}
          />
        </div>
        <p className="mt-5 text-lg font-semibold text-mowing-green">{title}</p>
        <p className="mt-1.5 text-sm text-mowing-green/60">{subtitle}</p>
      </div>
    </div>
  );
}
