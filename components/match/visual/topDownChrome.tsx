import type { ReactNode } from "react";

/** Shared top-down target line + target/tee markers (Figma start/curve kit). */
export function TopDownChrome() {
  return (
    <>
      {/* Dashed target line (golfer at bottom → target at top) */}
      <path
        d="M60 4V66"
        stroke="#AAC8B6"
        strokeWidth="1.6"
        strokeDasharray="4 4"
      />
      {/* Target marker */}
      <path
        d="M60 13C62.2091 13 64 11.2091 64 9C64 6.79086 62.2091 5 60 5C57.7909 5 56 6.79086 56 9C56 11.2091 57.7909 13 60 13Z"
        fill="#FFD25E"
        stroke="#265C4B"
        strokeWidth="1.4"
      />
      {/* Tee / start ball */}
      <path
        d="M60 68C62.2091 68 64 66.2091 64 64C64 61.7909 62.2091 60 60 60C57.7909 60 56 61.7909 56 64C56 66.2091 57.7909 68 60 68Z"
        fill="white"
        stroke="#265C4B"
        strokeWidth="1.5"
      />
    </>
  );
}

export function DiagramFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      width={120}
      height={72}
      viewBox="0 0 120 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="120" height="72" rx="8" fill="#E5E5E5" />
      {children}
    </svg>
  );
}
