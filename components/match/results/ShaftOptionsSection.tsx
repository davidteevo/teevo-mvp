"use client";

import { useId, useState } from "react";
import { track } from "@/lib/analytics";
import type { PresentedShaftOptionsSection } from "@/lib/match/app/present-shaft-options";

type Props = {
  catalogueKey: string;
  presented: PresentedShaftOptionsSection;
  /** When mode is none and page already shows shared guidance, keep the card quiet. */
  suppressEmptyGuidance: boolean;
};

function OptionBlock({
  title,
  flexLabel,
  weightLabel,
  launchLabel,
  why,
  prominent,
}: {
  title: string;
  flexLabel: string | null;
  weightLabel: string | null;
  launchLabel: string | null;
  why: string;
  prominent: boolean;
}) {
  const meta = [flexLabel, weightLabel, launchLabel]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  return (
    <div className={prominent ? "space-y-1" : "space-y-1 border-t border-mowing-green/10 pt-2"}>
      <p
        className={
          prominent
            ? "text-sm font-semibold leading-snug text-mowing-green break-words"
            : "text-sm font-medium leading-snug text-mowing-green break-words"
        }
      >
        {title}
      </p>
      {meta ? (
        <p className="text-xs leading-5 text-mowing-green/75 break-words">{meta}</p>
      ) : null}
      <p className="text-[13px] leading-5 text-mowing-green/90">{why}</p>
    </div>
  );
}

export function ShaftOptionsSection({
  catalogueKey,
  presented,
  suppressEmptyGuidance,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (presented.mode === "none") {
    if (suppressEmptyGuidance) {
      return presented.suggestedLoftLabel ? (
        <div className="mt-3 border-t border-mowing-green/15 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
            Loft
          </p>
          <p className="mt-1 text-xs leading-5 text-mowing-green/80">
            {presented.suggestedLoftLabel}
          </p>
        </div>
      ) : null;
    }
    return (
      <div className="mt-3 border-t border-mowing-green/15 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
          {presented.heading}
        </p>
        <p className="mt-1 text-sm text-mowing-green/80">
          Use the shaft profile guidance below for flex, weight and launch.
        </p>
        {presented.suggestedLoftLabel ? (
          <p className="mt-2 text-xs leading-5 text-mowing-green/80">
            {presented.suggestedLoftLabel}
          </p>
        ) : null}
      </div>
    );
  }

  const primary = presented.primary!;
  const hasMore = presented.alternatives.length > 0;

  return (
    <div className="mt-3 border-t border-mowing-green/15 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
        {presented.heading}
      </p>
      <div className="mt-2">
        <OptionBlock
          title={primary.title}
          flexLabel={primary.flexLabel}
          weightLabel={primary.weightLabel}
          launchLabel={primary.launchLabel}
          why={primary.why}
          prominent
        />
      </div>
      {presented.offeringNote ? (
        <p className="mt-2 text-xs leading-5 text-mowing-green/70">
          {presented.offeringNote}
        </p>
      ) : null}
      {presented.suggestedLoftLabel ? (
        <p className="mt-2 text-xs leading-5 text-mowing-green/80">
          {presented.suggestedLoftLabel}
        </p>
      ) : null}
      {hasMore ? (
        <div className="mt-1">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center text-left text-sm font-semibold text-mowing-green"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() =>
              setOpen((current) => {
                if (!current) {
                  track("match_shaft_options_expanded", {
                    surface: "admin_preview",
                    catalogue_key: catalogueKey,
                    option_count: 1 + presented.alternatives.length,
                  });
                }
                return !current;
              })
            }
          >
            {open ? "Hide other shaft option" : "Show other shaft option"}
          </button>
          <div id={panelId} hidden={!open} className="mt-2 space-y-2">
            {presented.differenceNote ? (
              <p className="text-xs leading-5 text-mowing-green/80">
                {presented.differenceNote}
              </p>
            ) : null}
            {presented.alternatives.map((option) => (
              <OptionBlock
                key={option.shaftKey}
                title={option.title}
                flexLabel={option.flexLabel}
                weightLabel={option.weightLabel}
                launchLabel={option.launchLabel}
                why={option.why}
                prominent={false}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
