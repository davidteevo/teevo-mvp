import { ShoppingCart } from "lucide-react";

function GolfBagIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-14 sm:w-14" aria-hidden>
      <path
        d="M28 10c0-2 1.5-4 4-4s4 2 4 4v4h-8v-4Z"
        fill="#265C4B"
      />
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
    <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-14 sm:w-14" aria-hidden>
      <ellipse cx="32" cy="50" rx="18" ry="6" fill="#49C184" opacity="0.45" />
      <path d="M24 50c2-8 6-18 8-28" stroke="#265C4B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M32 14l16 6-16 6V14Z" fill="#265C4B" />
      <circle cx="32" cy="14" r="2" fill="#265C4B" />
    </svg>
  );
}

function MoneyBadge({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="absolute -right-2 -bottom-1 flex h-11 w-11 flex-col items-center justify-center rounded-full bg-golden-tee text-center text-[9px] font-bold leading-[1.05] text-mowing-green shadow-sm sm:h-12 sm:w-12 sm:text-[10px]">
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

export function ReferralProcessSteps({
  variant = "buyer",
  discountLabel,
  rewardLabel,
}: {
  variant?: "buyer" | "seller";
  discountLabel: string;
  rewardLabel: string;
}) {
  const steps =
    variant === "seller"
      ? [
          {
            key: "invite",
            icon: (
              <div className="relative">
                <GolfBagIcon />
              </div>
            ),
            label: "They join Teevo with your link.",
          },
          {
            key: "sell",
            icon: (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-mowing-green/20 bg-white sm:h-14 sm:w-14">
                <ShoppingCart className="h-6 w-6 text-mowing-green" aria-hidden />
              </div>
            ),
            label: "They list or sell a club.",
          },
          {
            key: "credit",
            icon: (
              <div className="relative">
                <FlagGreenIcon />
                <MoneyBadge top={rewardLabel} bottom="CREDIT" />
              </div>
            ),
            label: `You get ${rewardLabel} Teevo credit.`,
          },
        ]
      : [
          {
            key: "off",
            icon: (
              <div className="relative">
                <GolfBagIcon />
                <MoneyBadge top={discountLabel} bottom="OFF" />
              </div>
            ),
            label: `They get ${discountLabel} off their first purchase.`,
          },
          {
            key: "buy",
            icon: (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-mowing-green/20 bg-white sm:h-14 sm:w-14">
                <ShoppingCart className="h-6 w-6 text-mowing-green" aria-hidden />
              </div>
            ),
            label: "They make a purchase.",
          },
          {
            key: "credit",
            icon: (
              <div className="relative">
                <FlagGreenIcon />
                <MoneyBadge top={rewardLabel} bottom="CREDIT" />
              </div>
            ),
            label: `You get ${rewardLabel} Teevo credit.`,
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
            </div>
            <p className="mt-3 text-[11px] font-medium leading-snug text-mowing-green sm:text-sm">
              <span className="sr-only">Step {i + 1}. </span>
              {step.label}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
