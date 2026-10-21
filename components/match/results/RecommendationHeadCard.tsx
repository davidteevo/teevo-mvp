"use client";

import { useId, useState } from "react";
import { track } from "@/lib/analytics";
import type { CatalogueHeadExplanation, CatalogueHeadScore } from "@/lib/match/catalogue-types";
import { presentHeadCard } from "@/lib/match/app/present-head-card";
import { LISTING_ROLE_LABEL, type ListingRoleCode } from "@/lib/match/app/present-listing-labels";
import type { MatchInventoryAttachedRow } from "@/lib/match/inventory/types";
import type { NormalisedRequirements } from "@/lib/match/types";
import { DriverSilhouette } from "@/components/match/results/DriverSilhouette";

type Props = {
  score: CatalogueHeadScore;
  peers: CatalogueHeadScore[];
  explanation: CatalogueHeadExplanation | undefined;
  requirements: NormalisedRequirements;
  listings: MatchInventoryAttachedRow[];
  listingRoles: Map<string, ListingRoleCode[]>;
  showEmptyListing: boolean;
};

function formatPrice(minor: number): string {
  return `£${(minor / 100).toFixed(2)}`;
}

export function RecommendationHeadCard({
  score,
  peers,
  explanation,
  requirements,
  listings,
  listingRoles,
  showEmptyListing,
}: Props) {
  const card = presentHeadCard(score, explanation, requirements, peers);
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
    <article className="flex h-full min-w-0 flex-col rounded-[20px] border border-mowing-green/15 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
        Head-only suitability
      </p>
      {card.roleLabel ? (
        <p className="mt-1 text-sm font-semibold text-mowing-green">{card.roleLabel}</p>
      ) : null}
      {card.bandLabel ? (
        <p className="mt-0.5 text-[17px] font-semibold text-mowing-green">{card.bandLabel}</p>
      ) : null}
      <div className="mt-3 flex gap-3">
        <DriverSilhouette />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight text-mowing-green">{card.title}</h2>
          {card.assessedLabel ? (
            <p className="mt-1 text-xs font-medium text-mowing-green">{card.assessedLabel}</p>
          ) : null}
          {card.confidenceLabel ? (
            <p className="mt-0.5 text-[11px] font-medium text-par-3-punch">{card.confidenceLabel}</p>
          ) : null}
        </div>
      </div>
      {card.reason ? (
        <p className="mt-3 text-[13px] leading-5 text-mowing-green/90">{card.reason.text}</p>
      ) : null}
      {card.caveat ? (
        <p className="mt-2 text-sm text-mowing-green">{card.caveat.text}</p>
      ) : null}
      {hasDetails ? (
        <div className="mt-3 border-t border-mowing-green/15 pt-2">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center text-left text-xs font-medium text-mowing-green"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((current) => !current)}
          >
            Loft &amp; shaft not scored
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            {open ? "Hide fit details" : "Why this driver"}
          </button>
          <div id={detailsId} hidden={!open} className="mt-2 space-y-2 text-sm text-mowing-green/80">
            {details.otherReasons.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {details.otherReasons.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {details.otherCaveats.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {details.otherCaveats.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {details.coverageLabel ? <p>{details.coverageLabel}</p> : null}
            {details.releaseYearLabel ? <p>{details.releaseYearLabel}</p> : null}
            {details.tradeOffs.length ? (
              <div>
                <p className="text-xs font-semibold uppercase text-mowing-green/60">Trade-offs</p>
                <ul className="list-disc space-y-1 pl-5">
                  {details.tradeOffs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {details.uncertainty.length ? (
              <div>
                <p className="text-xs font-semibold uppercase text-mowing-green/60">Uncertainty</p>
                <ul className="list-disc space-y-1 pl-5">
                  {details.uncertainty.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-mowing-green/15 pt-2 text-xs font-medium text-mowing-green">
          Loft &amp; shaft not scored
        </p>
      )}
      {listings.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {listings.map((row) => {
            const roles = listingRoles.get(row.item.source_listing_id) ?? [];
            return (
              <li
                key={row.item.source_listing_id}
                className="rounded-xl border border-mowing-green/15 px-3 py-2"
              >
                {roles.length > 0 ? (
                  <p className="flex flex-wrap gap-1">
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-par-3-punch/15 px-2 py-0.5 text-[11px] font-semibold text-mowing-green"
                      >
                        {LISTING_ROLE_LABEL[role]}
                      </span>
                    ))}
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-semibold text-mowing-green">
                  {formatPrice(row.item.price_minor)}
                  <span className="font-normal text-mowing-green/70">
                    {" "}
                    · {row.item.condition || "Condition n/a"}
                  </span>
                </p>
                {row.unverified_shaft ? (
                  <p className="mt-1 text-xs text-mowing-green">
                    Head only · configuration unverified. Shaft identity is unresolved, so this is
                    not a complete match.
                  </p>
                ) : null}
                {row.listing_match ? (
                  <p className="mt-1 text-xs text-mowing-green/70">
                    Listing match: {row.listing_match.match_band.replace(/_/g, " ")} ·{" "}
                    {row.listing_match.confidence} confidence
                  </p>
                ) : row.attach_mode === "HEAD_ONLY" && !row.unverified_shaft ? (
                  <p className="mt-1 text-xs text-mowing-green/70">
                    Listed for this head. Full match badge is not available.
                  </p>
                ) : null}
                <a
                  href={`/listing/${row.item.source_listing_id}`}
                  className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-mowing-green underline"
                  onClick={() =>
                    track("match_listing_clicked", {
                      surface: "admin_preview",
                      catalogue_key: score.catalogue_key,
                      listing_id: row.item.source_listing_id,
                      attach_mode: row.attach_mode,
                    })
                  }
                >
                  View listing
                </a>
              </li>
            );
          })}
        </ul>
      ) : showEmptyListing ? (
        <p className="mt-3 text-sm text-mowing-green/70">
          No matching Teevo listing for this head right now.
        </p>
      ) : null}
    </article>
  );
}
