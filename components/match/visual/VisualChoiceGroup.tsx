"use client";

import {
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";

export type VisualChoiceOption<T extends string> = {
  value: T;
  title: string;
  diagram: ReactNode;
};

type Props<T extends string> = {
  label: string;
  hint?: string;
  options: VisualChoiceOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
};

/**
 * Accessible visual radiogroup (Figma Visual Answer Card).
 * Text label is always shown; diagram is decorative.
 */
export function VisualChoiceGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  disabled = false,
  required,
  error,
}: Props<T>) {
  const labelId = useId();
  const hintId = useId();
  const errorId = useId();
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusIndex(index: number) {
    const el = itemRefs.current[index];
    el?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (disabled) return;
    const last = options.length - 1;
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      next = index === last ? 0 : index + 1;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      next = index === 0 ? last : index - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      next = last;
    } else {
      return;
    }
    onChange(options[next].value);
    focusIndex(next);
  }

  return (
    <div>
      <p
        id={labelId}
        className="text-sm font-medium text-mowing-green mb-1"
      >
        {label}
        {required ? <span className="text-par-3-punch"> *</span> : null}
      </p>
      {hint ? (
        <p id={hintId} className="text-xs text-mowing-green/60 mb-2">
          {hint}
        </p>
      ) : (
        <span className="block mb-2" />
      )}
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={
          [hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className="space-y-2"
      >
        {options.map((opt, index) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.title}
              disabled={disabled}
              tabIndex={
                disabled
                  ? -1
                  : selected || (!value && index === 0)
                    ? 0
                    : -1
              }
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={clsx(
                "flex w-full min-h-[84px] items-center gap-3 rounded-[18px] border px-3 py-1.5 text-left transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mowing-green",
                disabled && "cursor-not-allowed opacity-50",
                selected
                  ? "border-[2.5px] border-mowing-green bg-[#eaf8ed]"
                  : "border border-[#d7e5d9] bg-white hover:border-mowing-green/50"
              )}
            >
              <span className="shrink-0 overflow-hidden rounded-lg">
                {opt.diagram}
              </span>
              <span className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-mowing-green">
                {opt.title}
              </span>
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected
                    ? "border-mowing-green"
                    : "border-mowing-green/35"
                )}
                aria-hidden="true"
              >
                {selected ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-par-3-punch" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
