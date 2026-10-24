"use client";

import {
  Fragment,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { AttachedFollowUp } from "@/components/match/FitQuestionSection";
import { AnswerVisualTile } from "@/components/match/visual/AnswerVisualTile";

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
  /** Landscape diagrams are fitted into the shared square. Icons are drawn for it. */
  tile?: "diagram" | "icon";
  /** h3 when this question sits under another heading, such as a follow-up. */
  headingLevel?: 2 | 3;
  /** Keeps the label for the radiogroup when a parent summary is the visible heading. */
  hideLabel?: boolean;
  /** Shown directly under the selected answer, for an input or a follow-up choice. */
  followUp?: ReactNode;
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
  tile = "diagram",
  headingLevel = 2,
  hideLabel = false,
  followUp,
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

  const HeadingTag = headingLevel === 3 ? "h3" : "h2";

  return (
    <div>
      <HeadingTag
        id={labelId}
        className={clsx(
          hideLabel
            ? "sr-only"
            : headingLevel === 3
              ? "text-base font-semibold leading-snug text-mowing-green"
              : "text-lg font-semibold leading-snug text-mowing-green"
        )}
      >
        {label}
        {required ? <span className="text-par-3-punch"> *</span> : null}
      </HeadingTag>
      {hint ? (
        <p
          id={hintId}
          className={clsx(
            "text-sm leading-snug text-mowing-green/65 mb-3",
            !hideLabel && "mt-1"
          )}
        >
          {hint}
        </p>
      ) : (
        <span className="block mb-3" />
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
            <Fragment key={opt.value}>
              <button
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
                  "flex w-full min-h-[88px] items-center gap-3 rounded-[18px] border px-3 py-2 text-left transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mowing-green",
                  disabled && "cursor-not-allowed opacity-50",
                  selected
                    ? "border-[2.5px] border-mowing-green bg-[#eaf8ed]"
                    : "border border-[#d7e5d9] bg-white hover:border-mowing-green/50"
                )}
              >
                <AnswerVisualTile variant={tile}>{opt.diagram}</AnswerVisualTile>
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
              {selected && followUp ? (
                <AttachedFollowUp>{followUp}</AttachedFollowUp>
              ) : null}
            </Fragment>
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
