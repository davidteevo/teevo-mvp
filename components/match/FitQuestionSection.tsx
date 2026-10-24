import type { ReactNode } from "react";
import clsx from "clsx";

type SectionProps = {
  eyebrow?: string;
  /** First question on a screen. Later questions get a divider and extra space. */
  first?: boolean;
  children: ReactNode;
};

/**
 * One questionnaire question: eyebrow, then the heading and answers passed as children.
 * A divider plus the eyebrow marks where the next question starts.
 */
export function FitQuestionSection({ eyebrow, first = false, children }: SectionProps) {
  return (
    <section className={clsx(!first && "mt-8 border-t border-mowing-green/15 pt-6")}>
      {eyebrow ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-par-3-punch">
          {eyebrow}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/** Follow-up input or choices that belong to the selected answer above. */
export function AttachedFollowUp({ children }: { children: ReactNode }) {
  return (
    <div className="!mb-4 !mt-2 ml-4 border-l-2 border-par-3-punch pl-3">
      <div className="rounded-2xl border border-[#d7e5d9] bg-[#f7fbf8] p-3">
        {children}
      </div>
    </div>
  );
}
