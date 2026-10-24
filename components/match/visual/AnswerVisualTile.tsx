import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  children: ReactNode;
  /**
   * Diagram tiles scale the existing landscape artwork into the square.
   * Icon tiles are already drawn for this size.
   */
  variant?: "diagram" | "icon";
};

/**
 * Shared rounded-square visual for every Teevo Fit answer card.
 * Diagram backgrounds are knocked out so the tile colour shows through.
 */
export function AnswerVisualTile({ children, variant = "icon" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d7e5d9] bg-[#F0F8F1]",
        variant === "diagram" &&
          "[&_svg]:h-auto [&_svg]:w-[76px] [&_svg]:max-w-none [&_svg>rect:first-child]:fill-transparent"
      )}
    >
      {children}
    </span>
  );
}
