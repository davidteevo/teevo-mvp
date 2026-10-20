import { DiagramFrame } from "./topDownChrome";
import {
  STRIKE_IMPACT_RH,
  type StrikeHandedness,
  type StrikePatternEnum,
} from "@/lib/match/app/visual-option-maps";

/**
 * Driver clubface strike location (Figma Clubface symbols 15:538–15:575).
 * Decorative only — always pair with a visible text label.
 *
 * Right-handed address view matches Figma: heel (hosel) on the left, toe on the right,
 * high strike toward the top of the face, low strike toward the sole.
 * Left-handed view mirrors the face so heel stays nearest the hosel.
 * The stored enum is never changed by handedness.
 */
type Props = {
  value: StrikePatternEnum;
  handedness?: StrikeHandedness;
  className?: string;
};

const FACE =
  "M85 6H35C22.8497 6 13 15.8497 13 28V45C13 57.1503 22.8497 67 35 67H85C97.1503 67 107 57.1503 107 45V28C107 15.8497 97.1503 6 85 6Z";
const GROOVES = "M27 18H93M21 30H99M20 42H100M25 54H95";

function impactPath(cx: number, cy: number): string {
  const r = 8;
  return `M${cx} ${cy + r}C${cx + 4.4183} ${cy + r} ${cx + r} ${cy + 4.4183} ${cx + r} ${cy}C${cx + r} ${cy - 4.4183} ${cx + 4.4183} ${cy - r} ${cx} ${cy - r}C${cx - 4.4183} ${cy - r} ${cx - r} ${cy - 4.4183} ${cx - r} ${cy}C${cx - r} ${cy + 4.4183} ${cx - 4.4183} ${cy + r} ${cx} ${cy + r}Z`;
}

export function StrikeFaceDiagram({
  value,
  handedness = "RIGHT",
  className,
}: Props) {
  const mirror = handedness === "LEFT";
  const impacts = value === "UNKNOWN" ? [] : STRIKE_IMPACT_RH[value];

  return (
    <DiagramFrame className={className}>
      <g transform={mirror ? "translate(120 0) scale(-1 1)" : undefined}>
        <path d={FACE} fill="#F0F8F1" stroke="#265C4B" strokeWidth="2.5" />
        <path d={GROOVES} stroke="#AFCEBC" strokeWidth="1.6" />
        {impacts.map((point) => (
          <path
            key={`${point.cx}-${point.cy}`}
            d={impactPath(point.cx, point.cy)}
            fill="#FFD25E"
            stroke="#265C4B"
            strokeWidth="2.3"
          />
        ))}
      </g>
      {value === "UNKNOWN" ? (
        <text
          x="60"
          y="44"
          textAnchor="middle"
          fill="#265C4B"
          fontSize="28"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          ?
        </text>
      ) : null}
    </DiagramFrame>
  );
}
