import { DiagramUnknown } from "./DiagramUnknown";
import { DiagramFrame, TopDownChrome } from "./topDownChrome";

/**
 * Top-down initial start direction (Figma 2:13 LEFT, 2:20 CENTRE, 2:27 RIGHT,
 * 2:55 VARIABLE, unknown). Shows start relative to target line only — not finish.
 */
export type BallStartDiagramValue =
  | "LEFT"
  | "CENTRE"
  | "RIGHT"
  | "VARIABLE"
  | "UNKNOWN";

type Props = {
  value: BallStartDiagramValue;
  className?: string;
};

export function BallStartDiagram({ value, className }: Props) {
  if (value === "UNKNOWN") {
    return <DiagramUnknown className={className} />;
  }

  if (value === "VARIABLE") {
    return (
      <DiagramFrame className={className}>
        <TopDownChrome />
        <path
          d="M60 60C55 43 40 27 26 16"
          stroke="#265C4B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
        />
        <path
          d="M60 60C65 43 80 27 94 16"
          stroke="#49C184"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
        />
        <path
          d="M26 19C27.6569 19 29 17.6569 29 16C29 14.3431 27.6569 13 26 13C24.3431 13 23 14.3431 23 16C23 17.6569 24.3431 19 26 19Z"
          fill="#265C4B"
        />
        <path
          d="M94 19C95.6569 19 97 17.6569 97 16C97 14.3431 95.6569 13 94 13C92.3431 13 91 14.3431 91 16C91 17.6569 92.3431 19 94 19Z"
          fill="#49C184"
        />
      </DiagramFrame>
    );
  }

  const shot =
    value === "LEFT"
      ? {
          line: "M60 60L26 16",
          end: "M26 19.8C28.0987 19.8 29.8 18.0987 29.8 16C29.8 13.9013 28.0987 12.2 26 12.2C23.9013 12.2 22.2 13.9013 22.2 16C22.2 18.0987 23.9013 19.8 26 19.8Z",
        }
      : value === "RIGHT"
        ? {
            line: "M60 60L94 16",
            end: "M94 19.8C96.0987 19.8 97.8 18.0987 97.8 16C97.8 13.9013 96.0987 12.2 94 12.2C91.9013 12.2 90.2 13.9013 90.2 16C90.2 18.0987 91.9013 19.8 94 19.8Z",
          }
        : {
            line: "M60 60V17",
            end: "M60 20.8C62.0987 20.8 63.8 19.0987 63.8 17C63.8 14.9013 62.0987 13.2 60 13.2C57.9013 13.2 56.2 14.9013 56.2 17C56.2 19.0987 57.9013 20.8 60 20.8Z",
          };

  return (
    <DiagramFrame className={className}>
      <TopDownChrome />
      <path
        d={shot.line}
        stroke="#265C4B"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path d={shot.end} fill="#49C184" stroke="#265C4B" />
    </DiagramFrame>
  );
}
