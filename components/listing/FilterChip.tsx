"use client";

import clsx from "clsx";

type FilterChipProps = {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
};

export function FilterChip({
  children,
  selected,
  onClick,
  type = "button",
  className,
  disabled,
}: FilterChipProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-colors border",
        selected
          ? "bg-mowing-green text-white border-mowing-green"
          : "bg-white text-mowing-green border-mowing-green/35 hover:border-mowing-green/60 hover:bg-mowing-green/5",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  );
}
