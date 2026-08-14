import { Check } from "lucide-react";
import { getBuyerOrderProgress, type BuyerOrderProgressInput } from "@/lib/buyer-order-progress";

export function BuyerOrderProgress({ tx }: { tx: BuyerOrderProgressInput }) {
  const progress = getBuyerOrderProgress(tx);

  if (progress.outcome === "refunded") {
    const timeout = tx.cancellation_reason === "seller_dispatch_timeout";
    return (
      <p className="text-sm text-mowing-green/80">
        {timeout
          ? "This order was cancelled because the seller didn't dispatch in time. We've issued you a full refund."
          : <>This order was <span className="font-medium">refunded</span>.</>}
      </p>
    );
  }
  if (progress.outcome === "dispute") {
    return (
      <p className="text-sm text-mowing-green/80">
        This order is under <span className="font-medium">review</span>.
      </p>
    );
  }

  return (
    <div>
      <ol className="flex items-start" aria-label="Order progress">
        {progress.steps.map((step, index) => {
          const done = index < progress.currentIndex || progress.isTerminal;
          const current = index === progress.currentIndex && !progress.isTerminal;
          const complete = progress.isTerminal && index === progress.currentIndex;
          const filled = done || complete;
          const isLast = index === progress.steps.length - 1;

          return (
            <li key={step.id} className={`flex items-start ${isLast ? "shrink-0" : "flex-1"}`}>
              <div className="flex flex-col items-center min-w-0">
                <span
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold shrink-0",
                    filled
                      ? "bg-mowing-green text-off-white-pique"
                      : current
                        ? "bg-par-3-punch text-white ring-2 ring-par-3-punch/30"
                        : "border border-mowing-green/25 bg-white text-mowing-green/40",
                  ].join(" ")}
                  aria-current={current ? "step" : undefined}
                >
                  {filled ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </span>
                <span
                  className={[
                    "mt-1.5 text-center leading-tight",
                    "text-[10px] sm:text-xs",
                    current || complete ? "font-semibold text-mowing-green" : "text-mowing-green/55",
                  ].join(" ")}
                >
                  <span className="sm:hidden">{step.shortLabel}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </div>
              {!isLast && (
                <div
                  className={`mt-3 mx-1 h-0.5 flex-1 min-w-[8px] rounded-full ${
                    index < progress.currentIndex ? "bg-mowing-green" : "bg-mowing-green/15"
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-mowing-green/80">{progress.current.description}</p>
    </div>
  );
}
