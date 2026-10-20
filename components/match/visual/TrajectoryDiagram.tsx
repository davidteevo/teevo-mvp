import { DiagramUnknown } from "./DiagramUnknown";

/**
 * Side-on typical ball-flight diagrams from Figma Visual Question Kit
 * (nodes 2:88 LOW, 2:94 MID, 2:100 HIGH, 2:106 UNKNOWN).
 * Decorative only — always pair with a visible text label.
 */
export type TrajectoryDiagramValue = "LOW" | "MID" | "HIGH" | "UNKNOWN";

const FLIGHT_PATH: Record<"LOW" | "MID" | "HIGH", string> = {
  // Late-apex curves from Figma editable artwork (exact path data).
  LOW: "M12 58C32 55 52 42 78 42C91 42 101 50 108 58",
  MID: "M12 58C31 52 52 25 78 25C91 25 102 42 108 58",
  HIGH: "M12 58C28 42 51 10 78 10C92 10 103 38 108 58",
};

type Props = {
  value: TrajectoryDiagramValue;
  className?: string;
};

export function TrajectoryDiagram({ value, className }: Props) {
  if (value === "UNKNOWN") {
    return <DiagramUnknown className={className} />;
  }

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
      {/* Ground line */}
      <path d="M5 61H115" stroke="#AAC8B6" strokeWidth="2.5" />
      {/* Tee / start ball */}
      <path
        d="M12 62C14.2091 62 16 60.2091 16 58C16 55.7909 14.2091 54 12 54C9.79086 54 8 55.7909 8 58C8 60.2091 9.79086 62 12 62Z"
        fill="white"
        stroke="#265C4B"
        strokeWidth="1.4"
      />
      {/* Observed flight path (not a launch-monitor angle) */}
      <path
        d={FLIGHT_PATH[value]}
        stroke="#265C4B"
        strokeWidth="3.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Landing marker */}
      <path
        d="M108 61.5C109.933 61.5 111.5 59.933 111.5 58C111.5 56.067 109.933 54.5 108 54.5C106.067 54.5 104.5 56.067 104.5 58C104.5 59.933 106.067 61.5 108 61.5Z"
        fill="#49C184"
      />
    </svg>
  );
}
