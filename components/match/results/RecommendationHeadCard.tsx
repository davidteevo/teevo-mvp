"use client";

import { useId, useState } from "react";
import { track } from "@/lib/analytics";
import type { CatalogueHeadExplanation, CatalogueHeadScore } from "@/lib/match/catalogue-types";
import { presentHeadCard } from "@/lib/match/app/present-head-card";
import type { HeadChoice } from "@/lib/match/app/present-head-choices";
import type { ListingRoleCode } from "@/lib/match/app/present-listing-labels";
import type { MatchInventoryAttachedRow } from "@/lib/match/inventory/types";
import type { NormalisedRequirements } from "@/lib/match/types";
import { DriverSilhouette } from "@/components/match/results/DriverSilhouette";
import {
  FULL_LISTING_ASSESSED,
  HEAD_LISTING_ABSENT,
  HEAD_ONLY_UNSCORED_BODY,
  HEAD_ONLY_UNVERIFIED_BODY,
  HEAD_ONLY_UNVERIFIED_TITLE,
  browseModelSearchHref,
  formatListingPrice,
} from "@/lib/match/app/present-results-state";

type Props = {
  score: CatalogueHeadScore;
  peers: CatalogueHeadScore[];
  explanation: CatalogueHeadExplanation | undefined;
  requirements: NormalisedRequirements;
  listings: MatchInventoryAttachedRow[];
  choice: HeadChoice;
  listingRoles: Map<string, ListingRoleCode[]>;
  /** page: one notice covers every head. head: this model has no listing. unchecked: stock could not be read. */
  emptyListingsMode: "page" | "head" | "unchecked";
};

function listedAs(row: MatchInventoryAttachedRow): string | null {
  if (row.attach_mode !== "FULL_LISTING_MATCH" || row.unverified_shaft) return null;
  const config = row.item.listed_config;
  const parts = [
    config.stated_loft_deg != null ? `${config.stated_loft_deg}°` : null,
    config.shaft_label,
    config.shaft_flex_raw,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length > 0 ? `Listed as ${parts.join(" · ")}` : null;
}

export function RecommendationHeadCard({
  score,
  peers,
  explanation,
  requirements,
  listings,
  choice,
  listingRoles,
  emptyListingsMode,
}: Props) {
  const card = presentHeadCard(score, explanation, requirements, peers);
  const details = card.details;
  const browseHref = browseModelSearchHref(score.brand, score.model);
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const category = choice.label;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-[20px] border border-mowing-green/15 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
        Head-only suitability
      </p>
      {category ? (
        <p className="mt-1 text-sm font-semibold text-mowing-green">{category}</p>
      ) : null}
      {choice.note ? (
        <p className="mt-1 text-xs leading-5 text-mowing-green/80">{choice.note}</p>
      ) : null}
      <div className="mt-3 flex gap-3">
        <div className="shrink-0">
          <DriverSilhouette />
          <p className="mt-1 max-w-[104px] text-[10px] leading-4 text-mowing-green/60">
            Illustration, not a photo of this model
          </p>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight text-mowing-green">{card.title}</h2>
          {card.releaseYear != null ? (
            <p className="mt-1 text-xs font-medium text-mowing-green/70">{card.releaseYear}</p>
          ) : null}
          <p className="mt-1 text-xs text-mowing-green/70">Head characteristics only. Loft and shaft are not assessed.</p>
        </div>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-mowing-green">Why this fits you</h3>
      {card.headline ? (
        <p className="mt-1 text-base font-semibold leading-snug text-mowing-green">{card.headline}</p>
      ) : card.reason ? null : (
        <p className="mt-1 text-sm leading-5 text-mowing-green/80">
          We could not match a head characteristic to the answers so far.
        </p>
      )}
      {card.reason ? (
        <p className="mt-2 text-[13px] leading-5 text-mowing-green/90">{card.reason.text}</p>
      ) : null}
      {card.benefits.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {card.benefits.map((benefit) => (
            <li
              key={benefit.code}
              className="rounded-full bg-par-3-punch/15 px-2.5 py-1 text-xs font-semibold text-mowing-green"
            >
              {benefit.text}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 border-t border-mowing-green/15 pt-2">
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center text-left text-sm font-semibold text-mowing-green"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() =>
            setOpen((current) => {
              if (!current) {
                track("match_fit_details_opened", {
                  surface: "admin_preview",
                  catalogue_key: score.catalogue_key,
                  role: card.role,
                });
              }
              return !current;
            })
          }
        >
          {open ? "Hide fit details" : "More fit details"}
        </button>
        <div id={detailsId} hidden={!open} className="mt-2 space-y-2 text-sm text-mowing-green/80">
          <p>Shaft and loft are not included in this head recommendation.</p>
          {card.bandLabel ? <p>{card.bandLabel}</p> : null}
          {card.confidenceLabel ? <p>{card.confidenceLabel}</p> : null}
          {card.assessedLabel ? <p>{card.assessedLabel}</p> : null}
          {card.caveat ? <p>{card.caveat.text}</p> : null}
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
      {listings.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {listings.map((row) => {
            const roles = listingRoles.get(row.item.source_listing_id) ?? [];
            const fullMatch = row.attach_mode === "FULL_LISTING_MATCH" && !row.unverified_shaft;
            const config = listedAs(row);
            const price = formatListingPrice(row.item.price_minor);
            return (
              <li
                key={row.item.source_listing_id}
                className="rounded-xl border border-mowing-green/15 px-3 py-2"
              >
                <div className="mt-1 flex gap-3">
                  {row.item.primary_image_url ? (
                    <img
                      src={row.item.primary_image_url}
                      alt="Seller photo of this listing"
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  ) : null}
                  <p className="text-sm font-semibold text-mowing-green">
                    {price ?? "Price unavailable"}
                    <span className="font-normal text-mowing-green/70">
                      {" "}
                      · {row.item.condition || "Condition not stated"}
                    </span>
                  </p>
                </div>
                {config ? <p className="mt-1 text-xs text-mowing-green/80">{config}</p> : null}
                {fullMatch ? (
                  <p className="mt-1 text-xs text-mowing-green/80">{FULL_LISTING_ASSESSED}</p>
                ) : null}
                {row.unverified_shaft ? (
                  <div className="mt-1 text-xs text-mowing-green">
                    <p className="font-semibold">{HEAD_ONLY_UNVERIFIED_TITLE}</p>
                    <p className="mt-1">{HEAD_ONLY_UNVERIFIED_BODY}</p>
                  </div>
                ) : null}
                {row.listing_match && fullMatch ? null : row.attach_mode === "HEAD_ONLY" &&
                  !row.unverified_shaft ? (
                  <p className="mt-1 text-xs text-mowing-green/70">
                    {HEAD_ONLY_UNSCORED_BODY}
                  </p>
                ) : null}
                <a
                  href={`/listing/${row.item.source_listing_id}`}
                  className={
                    fullMatch
                      ? "mt-2 inline-flex min-h-[48px] items-center rounded-xl bg-mowing-green px-4 text-sm font-semibold text-white"
                      : "mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-mowing-green underline"
                  }
                  onClick={() =>
                    track("match_listing_clicked", {
                      surface: "admin_preview",
                      catalogue_key: score.catalogue_key,
                      listing_id: row.item.source_listing_id,
                      attach_mode: row.attach_mode,
                      listing_roles: roles,
                    })
                  }
                >
                  {fullMatch ? "View this driver" : "View listing"}
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3">
          {emptyListingsMode === "head" ? (
            <p className="text-sm text-mowing-green/70">{HEAD_LISTING_ABSENT}</p>
          ) : null}
          {browseHref ? (
            <a
              href={browseHref}
              className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-mowing-green underline"
              onClick={() =>
                track("match_model_browse_clicked", {
                  surface: "admin_preview",
                  catalogue_key: score.catalogue_key,
                  role: card.role,
                })
              }
            >
              Browse Teevo for this model
            </a>
          ) : null}
        </div>
      )}
    </article>
  );
}
