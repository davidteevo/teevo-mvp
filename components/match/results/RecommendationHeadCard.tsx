"use client";

import { useId, useState } from "react";
import type { CatalogueHeadExplanation, CatalogueHeadScore } from "@/lib/match/catalogue-types";
import { presentHeadCard } from "@/lib/match/app/present-head-card";
import type { NormalisedRequirements } from "@/lib/match/types";

type Props = {
  score: CatalogueHeadScore;
  explanation: CatalogueHeadExplanation | undefined;
  requirements: NormalisedRequirements;
};

export function RecommendationHeadCard({ score, explanation, requirements }: Props) {
  const card = presentHeadCard(score, explanation, requirements);
  const details = card.details;
  const hasDetails =
    details.otherCaveats.length > 0 ||
    details.otherReasons.length > 0 ||
    details.tradeOffs.length > 0 ||
    details.uncertainty.length > 0 ||
    details.coverageLabel != null ||
    details.releaseYearLabel != null;
  const [open, setOpen] = useState(false);
  const detailsId = useId();

  return (
    <article className="min-w-0 rounded-xl border border-mowing-green/15 bg-white p-4 space-y-2">
      {card.bandLabel ? (
        <p className="text-sm font-medium text-par-3-punch">{card.bandLabel}</p>
      ) : null}
      <h2 className="text-lg font-semibold text-mowing-green">{card.title}</h2>
      {card.reason ? (
        <p className="text-sm text-mowing-green/80">{card.reason.text}</p>
      ) : null}
      {card.caveat ? (
        <p className="text-sm text-mowing-green">{card.caveat.text}</p>
      ) : null}
      {hasDetails ? (
        <div>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-mowing-green underline"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "Hide fit details" : "View fit details"}
          </button>
          <div
            id={detailsId}
            hidden={!open}
            className="mt-2 space-y-2 text-sm text-mowing-green/80"
          >
              {details.otherCaveats.length ? (
                <ul className="list-disc pl-5 space-y-1">
                  {details.otherCaveats.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {details.otherReasons.length ? (
                <ul className="list-disc pl-5 space-y-1">
                  {details.otherReasons.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {details.coverageLabel ? <p>{details.coverageLabel}</p> : null}
              {details.releaseYearLabel ? <p>{details.releaseYearLabel}</p> : null}
              {details.tradeOffs.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-mowing-green/60">
                    Trade-offs
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {details.tradeOffs.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {details.uncertainty.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-mowing-green/60">
                    Uncertainty
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {details.uncertainty.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
