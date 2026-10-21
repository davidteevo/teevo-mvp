"use client";

import { useId, useState } from "react";
import { track } from "@/lib/analytics";
import type { CatalogueHeadExplanation, CatalogueHeadScore } from "@/lib/match/catalogue-types";
import { presentHeadCard } from "@/lib/match/app/present-head-card";
import {
  LISTING_ROLE_LABEL,
  presentListingCommercialNotes,
  type ListingRoleCode,
} from "@/lib/match/app/present-listing-labels";
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

function browseModelHref(score: CatalogueHeadScore): string {
  const params = new URLSearchParams();
  params.set("category", "Driver");
  if (score.brand?.trim()) params.set("brand", score.brand.trim());
  if (score.model?.trim()) params.set("search", score.model.trim());
  return `/?${params.toString()}`;
}

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
  listingRoles,
  showEmptyListing,
}: Props) {
  const card = presentHeadCard(score, explanation, requirements, peers);
  const details = card.details;
  const notes = presentListingCommercialNotes(listings, listingRoles);
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const category = card.roleLabel ?? "Head match";

  return (
    <article className="flex h-full min-w-0 flex-col rounded-[20px] border border-mowing-green/15 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-par-3-punch">
        Head-only suitability
      </p>
      <p className="mt-1 text-sm font-semibold text-mowing-green">{category}</p>
      <div className="mt-3 flex gap-3">
        <DriverSilhouette />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight text-mowing-green">{card.title}</h2>
          {card.releaseYear != null ? (
            <p className="mt-1 text-xs font-medium text-mowing-green/70">{card.releaseYear}</p>
          ) : null}
          <p className="mt-1 text-xs text-mowing-green/70">Head characteristics only</p>
        </div>
      </div>
      {card.headline ? (
        <p className="mt-3 text-base font-semibold leading-snug text-mowing-green">{card.headline}</p>
      ) : null}
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
          {open ? "Hide fit details" : "Why this fits you"}
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
            const note = notes.get(row.item.source_listing_id);
            const fullMatch = row.attach_mode === "FULL_LISTING_MATCH" && !row.unverified_shaft;
            const config = listedAs(row);
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
                {config ? <p className="mt-1 text-xs text-mowing-green/80">{config}</p> : null}
                {note?.savingGbp != null ? (
                  <p className="mt-1 text-xs font-semibold text-mowing-green">
                    £{note.savingGbp.toFixed(2)} less than the Best Match.
                  </p>
                ) : null}
                {note?.fitVersusBestMatch === "lower" ? (
                  <p className="mt-1 text-xs text-mowing-green/80">
                    The listing fit is lower than the Best Match.
                  </p>
                ) : null}
                {roles.includes("BUDGET_OPTION") ? (
                  <p className="mt-1 text-xs text-mowing-green/80">
                    The lowest price among the listings that cleared the match bar.
                  </p>
                ) : null}
                {row.unverified_shaft ? (
                  <p className="mt-1 text-xs text-mowing-green">
                    Head only · configuration unverified. Shaft identity is unresolved, so this is
                    not a complete match.
                  </p>
                ) : null}
                {row.listing_match && fullMatch ? null : row.attach_mode === "HEAD_ONLY" &&
                  !row.unverified_shaft ? (
                  <p className="mt-1 text-xs text-mowing-green/70">
                    Listed for this head. Full match badge is not available.
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
          {showEmptyListing ? (
            <p className="text-sm text-mowing-green/70">
              No verified Teevo listing for this head right now.
            </p>
          ) : (
            <p className="text-sm text-mowing-green/70">
              No verified Teevo listing is attached to this head.
            </p>
          )}
          <a
            href={browseModelHref(score)}
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
        </div>
      )}
    </article>
  );
}
