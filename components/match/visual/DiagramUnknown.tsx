/** Shared UNKNOWN / Not sure diagram (Figma `2:106`). Decorative only. */
export function DiagramUnknown({ className }: { className?: string }) {
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
      <path
        d="M93 7H27C19.268 7 13 13.268 13 21V51C13 58.732 19.268 65 27 65H93C100.732 65 107 58.732 107 51V21C107 13.268 100.732 7 93 7Z"
        fill="#F2F5EF"
        stroke="#C6DACB"
        strokeDasharray="4 4"
      />
      <text
        x="60"
        y="46"
        textAnchor="middle"
        fill="#265C4B"
        fontSize="36"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        ?
      </text>
    </svg>
  );
}
