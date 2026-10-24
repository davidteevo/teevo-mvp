import type { ReactNode } from "react";

const INK = "#265C4B";
const ACCENT = "#49C184";
const GROOVE = "#AFCEBC";

export type FitAnswerIconName =
  | "hand-right"
  | "hand-left"
  | "miss-small"
  | "miss-moderate"
  | "miss-large"
  | "unsure"
  | "speed-measured"
  | "speed-estimated"
  | "carry"
  | "speed-band"
  | "band-slow"
  | "band-medium"
  | "band-fast"
  | "contact-solid"
  | "contact-mixed"
  | "contact-poor"
  | "goal-distance"
  | "goal-forgiveness"
  | "goal-accuracy"
  | "goal-control"
  | "goal-flight"
  | "flight-higher"
  | "flight-lower"
  | "keep"
  | "miss-left"
  | "miss-right";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block"
    >
      {children}
    </svg>
  );
}

function Club({ mirror }: { mirror?: boolean }) {
  return (
    <Glyph>
      <g transform={mirror ? "translate(40 0) scale(-1 1)" : undefined}>
        <path
          d="M13 8 L25 29"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M21 27.5 H31.5 C32.3 27.5 33 28.2 33 29.1 C33 31.2 31 32.5 28.2 32.5 H22.2 C21.2 32.5 20.4 31.7 20.4 30.7 V28.4 C20.4 27.9 20.7 27.5 21 27.5 Z"
          fill={ACCENT}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="11" r="2.1" fill="#FFD25E" stroke={INK} strokeWidth="1.3" />
      </g>
    </Glyph>
  );
}

function Dispersion({ spread }: { spread: "small" | "moderate" | "large" }) {
  const dots =
    spread === "small"
      ? [
          [20, 18],
          [17.2, 21.2],
          [22.8, 21.2],
        ]
      : spread === "moderate"
        ? [
            [20, 13.5],
            [14.2, 22.5],
            [25.8, 22.5],
          ]
        : [
            [20, 9.5],
            [10.5, 24],
            [29.5, 20.5],
          ];

  return (
    <Glyph>
      <circle cx="20" cy="20" r="13" stroke={INK} strokeWidth="1.8" />
      <circle cx="20" cy="20" r="7.5" stroke={ACCENT} strokeWidth="1.6" />
      <circle cx="20" cy="20" r="1.4" fill={ACCENT} />
      {dots.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" fill={INK} />
      ))}
    </Glyph>
  );
}

function Gauge({ dashed }: { dashed?: boolean }) {
  return (
    <Glyph>
      <path
        d="M8 27.5 A12 12 0 1 1 32 27.5"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 27 L28.2 16.5"
        stroke={ACCENT}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dashed ? "2.4 2.2" : undefined}
      />
      <circle cx="20" cy="27" r="2.1" fill={INK} />
    </Glyph>
  );
}

function Bars({ active }: { active: 1 | 2 | 3 | "all" }) {
  const heights = [8, 14, 20];
  return (
    <Glyph>
      {heights.map((height, index) => {
        const on = active === "all" ? true : index < active;
        return (
          <rect
            key={height}
            x={8 + index * 9}
            y={30 - height}
            width="6"
            height={height}
            rx="1.5"
            fill={on ? (index === 2 ? ACCENT : INK) : GROOVE}
          />
        );
      })}
    </Glyph>
  );
}

function Face({ marks }: { marks: Array<[number, number]> }) {
  return (
    <Glyph>
      <rect
        x="8"
        y="7"
        width="24"
        height="26"
        rx="6"
        stroke={INK}
        strokeWidth="1.8"
      />
      <path d="M12 15.5 H28 M12 21 H28 M12 26.5 H28" stroke={GROOVE} strokeWidth="1.4" />
      {marks.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="2.1"
          fill="#FFD25E"
          stroke={INK}
          strokeWidth="1.2"
        />
      ))}
    </Glyph>
  );
}

function Arc({ d, accent }: { d: string; accent?: boolean }) {
  return (
    <Glyph>
      <path d="M7 32 H33" stroke={GROOVE} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="30" r="2" fill="white" stroke={INK} strokeWidth="1.3" />
      <path
        d={d}
        stroke={accent ? ACCENT : INK}
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    </Glyph>
  );
}

export function FitAnswerIcon({ name }: { name: FitAnswerIconName }) {
  switch (name) {
    case "hand-right":
      return <Club />;
    case "hand-left":
      return <Club mirror />;
    case "miss-small":
      return <Dispersion spread="small" />;
    case "miss-moderate":
      return <Dispersion spread="moderate" />;
    case "miss-large":
      return <Dispersion spread="large" />;
    case "unsure":
      return (
        <Glyph>
          <circle
            cx="20"
            cy="20"
            r="12"
            stroke={INK}
            strokeWidth="1.7"
            strokeDasharray="3 3"
          />
          <text
            x="20"
            y="26"
            textAnchor="middle"
            fill={INK}
            fontSize="18"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            ?
          </text>
        </Glyph>
      );
    case "speed-measured":
      return <Gauge />;
    case "speed-estimated":
      return <Gauge dashed />;
    case "carry":
      return (
        <Glyph>
          <path d="M15 32 V9" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M15 10 H28 L24.5 14.2 L28 18.4 H15"
            fill={ACCENT}
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M9 32 H24" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        </Glyph>
      );
    case "speed-band":
      return <Bars active="all" />;
    case "band-slow":
      return <Bars active={1} />;
    case "band-medium":
      return <Bars active={2} />;
    case "band-fast":
      return <Bars active={3} />;
    case "contact-solid":
      return <Face marks={[[20, 20]]} />;
    case "contact-mixed":
      return (
        <Face
          marks={[
            [16, 17],
            [24, 24],
          ]}
        />
      );
    case "contact-poor":
      return (
        <Face
          marks={[
            [13, 14],
            [26, 18],
            [18, 27],
          ]}
        />
      );
    case "goal-distance":
      return (
        <Glyph>
          <path
            d="M9 29 L27 11"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16 11 H27 V22"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Glyph>
      );
    case "goal-forgiveness":
      return (
        <Glyph>
          <circle cx="20" cy="20" r="13" stroke={INK} strokeWidth="1.8" />
          <circle cx="20" cy="20" r="6" fill={ACCENT} fillOpacity="0.35" stroke={ACCENT} strokeWidth="1.6" />
        </Glyph>
      );
    case "goal-accuracy":
      return (
        <Glyph>
          <circle cx="20" cy="20" r="10" stroke={INK} strokeWidth="1.8" />
          <circle cx="20" cy="20" r="2.4" fill={ACCENT} />
          <path
            d="M20 6 V12 M20 28 V34 M6 20 H12 M28 20 H34"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </Glyph>
      );
    case "goal-control":
      return (
        <Glyph>
          <circle cx="20" cy="22" r="9" stroke={INK} strokeWidth="1.8" />
          <path
            d="M20 22 L26.5 15.5"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="20" cy="22" r="1.8" fill={INK} />
          <path d="M11 8 H29" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
        </Glyph>
      );
    case "goal-flight":
      return (
        <Glyph>
          <path d="M7 31 H33" stroke={GROOVE} strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M8 30 C16 28 20 22 32 21"
            stroke={INK}
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M8 30 C14 22 18 10 32 9"
            stroke={ACCENT}
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
        </Glyph>
      );
    case "flight-higher":
      return <Arc d="M9 30 C16 26 20 12 33 8" accent />;
    case "flight-lower":
      return <Arc d="M9 30 C16 29 24 26 33 24" />;
    case "keep":
      return (
        <Glyph>
          <circle cx="20" cy="20" r="12" stroke={INK} strokeWidth="1.8" />
          <path
            d="M13 20.5 L18 25.2 L27.5 15"
            stroke={ACCENT}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Glyph>
      );
    case "miss-left":
      return (
        <Glyph>
          <path
            d="M30 31 C26 20 16 16 9 8"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="9" cy="8" r="2.3" fill={ACCENT} stroke={INK} strokeWidth="1.2" />
        </Glyph>
      );
    case "miss-right":
      return (
        <Glyph>
          <path
            d="M10 31 C14 20 24 16 31 8"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="31" cy="8" r="2.3" fill={ACCENT} stroke={INK} strokeWidth="1.2" />
        </Glyph>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
