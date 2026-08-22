"use client";

import { Camera, Check, PoundSterling, SlidersHorizontal, Tag } from "lucide-react";

type WizardStep = {
  id: number;
  label: string;
  Icon: typeof Camera;
};

export function ListingWizardTimeline({
  step,
  includeClubDetails,
}: {
  step: number;
  includeClubDetails: boolean;
}) {
  const steps: WizardStep[] = includeClubDetails
    ? [
        { id: 1, label: "Item", Icon: Tag },
        { id: 2, label: "Photos", Icon: Camera },
        { id: 3, label: "Details", Icon: SlidersHorizontal },
        { id: 4, label: "Price", Icon: PoundSterling },
      ]
    : [
        { id: 1, label: "Item", Icon: Tag },
        { id: 2, label: "Photos", Icon: Camera },
        { id: 3, label: "Price", Icon: PoundSterling },
      ];

  return (
    <div
      className="mb-5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={step}
      aria-label={`Listing step ${step} of ${steps.length}`}
    >
      <div className="flex items-start">
        {steps.map((s, i) => {
          const done = step > s.id;
          const current = step === s.id;
          const Icon = s.Icon;
          return (
            <div key={s.id} className="flex flex-1 items-start min-w-0">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                    done
                      ? "border-mowing-green bg-mowing-green text-off-white-pique"
                      : current
                        ? "border-par-3-punch bg-white text-mowing-green ring-2 ring-par-3-punch/30"
                        : "border-mowing-green/25 bg-off-white-pique text-mowing-green/40"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  )}
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    current ? "text-mowing-green" : done ? "text-mowing-green/80" : "text-mowing-green/40"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={`mt-[18px] h-0.5 flex-1 min-w-[8px] rounded-full ${
                    step > s.id ? "bg-par-3-punch" : "bg-mowing-green/15"
                  }`}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
