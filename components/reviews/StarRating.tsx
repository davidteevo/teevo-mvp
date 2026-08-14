"use client";

import { useId } from "react";

export function StarRating({
  value,
  onChange,
  size = "lg",
  readOnly = false,
  label,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "lg";
  readOnly?: boolean;
  label?: string;
}) {
  const groupId = useId();
  const px = size === "lg" ? 36 : 18;
  const interactive = !readOnly && typeof onChange === "function";

  return (
    <div
      role={interactive ? "radiogroup" : "img"}
      aria-label={label ?? (value ? `${value} out of 5 stars` : "Star rating")}
      className="inline-flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <svg
            width={px}
            height={px}
            viewBox="0 0 24 24"
            aria-hidden
            className={filled ? "text-golden-tee" : "text-mowing-green/25"}
          >
            <path
              fill="currentColor"
              d="M12 2.5l2.76 6.02 6.54.74-4.86 4.45 1.36 6.45L12 16.9 6.2 20.16l1.36-6.45L2.7 9.26l6.54-.74L12 2.5z"
            />
          </svg>
        );
        if (!interactive) {
          return (
            <span key={n} className="inline-flex">
              {star}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            name={groupId}
            onClick={() => onChange?.(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange?.(Math.min(5, (value || 0) + 1));
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange?.(Math.max(1, (value || 1) - 1));
              }
            }}
            className="rounded-md p-0.5 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-par-3-punch transition-transform"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
