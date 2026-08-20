import type { ReactNode } from "react";
import { ShoppingCart } from "lucide-react";
import { ReferralPriority, type ReferralPriorityValue } from "@/lib/referral/types";

function GolfClubIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
      <path d="M43 7.5c1.4.6 2.2 2.4 1.6 4L26 52.5c-.4 1.1-1.6 1.6-2.7 1.2-1.1-.4-1.6-1.6-1.2-2.7L40.7 10c.6-1.5 1-3.1 2.3-2.5Z" fill="#265C4B" />
      <path d="M16 49c7 2.2 16 4 21.2.6 1.3-.9.9-2.4-.6-3-3.4-1.4-10.2.2-16.8-1.6-1.6-.4-3.2 1.2-3.8 4Z" fill="#265C4B" />
    </svg>
  );
}

function GolfBagIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
      <path d="M28 10c0-2 1.5-4 4-4s4 2 4 4v4h-8v-4Z" fill="#265C4B" />
      <path d="M30 8.5c2-3 8-3 10 1" stroke="#265C4B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M22 18h20l2 28c0 4-4 7-12 7s-12-3-12-7l2-28Z" fill="#265C4B" />
      <path d="M26 22h12" stroke="#FDFCF5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <text x="32" y="40" textAnchor="middle" fill="#FDFCF5" fontSize="7" fontWeight="700" fontFamily="system-ui,sans-serif">
        teevo
      </text>
    </svg>
  );
}

function FlagGreenIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
      <ellipse cx="32" cy="50" rx="18" ry="6" fill="#49C184" opacity="0.45" />
      <path d="M24 50c2-8 6-18 8-28" stroke="#265C4B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M32 14l16 6-16 6V14Z" fill="#265C4B" />
      <circle cx="32" cy="14" r="2" fill="#265C4B" />
    </svg>
  );
}

function MoneyBadge({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="absolute -right-3 -bottom-3 z-10 flex h-8 w-8 flex-col items-center justify-center rounded-full bg-golden-tee text-center text-[8px] font-bold leading-[1.05] text-mowing-green ring-2 ring-off-white-pique sm:h-9 sm:w-9 sm:text-[9px]">
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

export function ReferralProcessSteps({
  priority = ReferralPriority.DEMAND,
  variant,
  discountLabel,
  rewardLabel,
}: {
  priority?: ReferralPriorityValue;
  /** @deprecated Prefer priority. */
  variant?: "buyer" | "seller";
  discountLabel: string;
  rewardLabel: string;
}) {
  const isSupply =
    priority === ReferralPriority.SUPPLY || (!priority && variant === "seller");

  const steps: {
    key: string;
    icon: ReactNode;
    label: string;
    badge?: { top: string; bottom: string };
  }[] = isSupply
    ? [
        {
          key: "invite",
          icon: <GolfBagIcon />,
          label: "They join Teevo with your link.",
        },
        {
          key: "list",
          icon: <GolfClubIcon />,
          label: "They list a club — and get it approved.",
          badge: { top: rewardLabel, bottom: "EACH" },
        },
        {
          key: "credit",
          icon: <FlagGreenIcon />,
          label: `You both get ${rewardLabel} Teevo credit.`,
          badge: { top: rewardLabel, bottom: "CREDIT" },
        },
      ]
    : [
        {
          key: "off",
          icon: <GolfClubIcon />,
          label: `They get ${discountLabel} off their first purchase.`,
          badge: { top: discountLabel, bottom: "OFF" },
        },
        {
          key: "buy",
          icon: (
            <div className="flex h-8 w-8 items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-mowing-green" aria-hidden />
            </div>
          ),
          label: "They make a purchase.",
        },
        {
          key: "credit",
          icon: <FlagGreenIcon />,
          label: `You get ${rewardLabel} Teevo credit.`,
          badge: { top: rewardLabel, bottom: "CREDIT" },
        },
      ];

  return (
    <div className="relative mt-6">
      <div
        className="pointer-events-none absolute left-[18%] right-[18%] top-8 border-t-2 border-dotted border-mowing-green/25 sm:top-9"
        aria-hidden
      />
      <ol className="relative z-[1] grid grid-cols-3 gap-2 sm:gap-4">
        {steps.map((step, i) => (
          <li key={step.key} className="flex flex-col items-center text-center">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-visible rounded-full bg-off-white-pique sm:h-[4.5rem] sm:w-[4.5rem]">
              {step.icon}
              {step.badge ? <MoneyBadge top={step.badge.top} bottom={step.badge.bottom} /> : null}
            </div>
            <p className="mt-4 text-[11px] font-medium leading-snug text-mowing-green sm:text-sm">
              <span className="sr-only">Step {i + 1}. </span>
              {step.label}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
