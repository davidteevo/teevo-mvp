"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogueRecommendResult } from "@/lib/match/catalogue-types";

export function MatchResults() {
  const [result, setResult] = useState<CatalogueRecommendResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("teevo_match_admin_results_v1");
      if (raw) setResult(JSON.parse(raw) as CatalogueRecommendResult);
    } catch {
      setResult(null);
    }
  }, []);

  if (!result) {
    return (
      <div className="max-w-xl space-y-3">
        <p className="text-sm text-mowing-green/80">No results in this session.</p>
        <Link
          href="/admin/match/questionnaire"
          className="text-sm font-semibold text-mowing-green underline"
        >
          Start questionnaire
        </Link>
      </div>
    );
  }

  const g = result.characteristic_guidance;
  const shaft = result.shaft_guidance;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-par-3-punch">
          Admin preview · not purchasable offers
        </p>
        <h1 className="text-2xl font-semibold text-mowing-green mt-1">
          Equipment recommendations
        </h1>
        <p className="text-sm text-mowing-green/70 mt-1">
          Mode: {result.mode.replace(/_/g, " ").toLowerCase()}.
        </p>
        <div className="mt-3 rounded-xl border border-par-3-punch/40 bg-par-3-punch/5 px-3 py-2 text-sm text-mowing-green">
          <p className="font-semibold">Model-level only — not a purchase offer</p>
          <p className="mt-1 text-mowing-green/80">
            Catalogue Fit does not score loft or shaft. Recommendations do not
            prove a handedness, loft or shaft configuration exists. Confirm on
            real inventory before buying.
          </p>
        </div>
      </div>

      {result.mode === "NAMED_HEADS" &&
        result.recommendations.map((rec, i) => {
          const exp = result.explanations[i];
          return (
            <article
              key={rec.catalogue_key}
              className="rounded-xl border border-mowing-green/15 bg-white p-4 space-y-2"
            >
              <p className="text-xs font-medium text-par-3-punch">
                Suitability · {rec.catalogue_match_band?.replace(/_/g, " ")} ·{" "}
                {rec.head_recommendation_confidence} confidence
              </p>
              <h2 className="text-lg font-semibold text-mowing-green">
                {rec.display_name ||
                  [rec.brand, rec.model].filter(Boolean).join(" ")}
              </h2>
              <p className="text-sm text-mowing-green/80">
                {exp?.suitability_summary}
              </p>
              {exp?.reasons?.length ? (
                <ul className="list-disc pl-5 text-sm text-mowing-green/80 space-y-1">
                  {exp.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
              {exp?.trade_offs?.length ? (
                <div>
                  <p className="text-xs font-semibold text-mowing-green/60 uppercase">
                    Trade-offs
                  </p>
                  <ul className="list-disc pl-5 text-sm text-mowing-green/70">
                    {exp.trade_offs.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {exp?.uncertainty?.length ? (
                <div>
                  <p className="text-xs font-semibold text-mowing-green/60 uppercase">
                    Uncertainty
                  </p>
                  <ul className="list-disc pl-5 text-sm text-mowing-green/70">
                    {exp.uncertainty.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}

      {(result.mode === "CHARACTERISTIC_GUIDANCE" ||
        result.mode === "NO_DEFENSIBLE_HEADS") && (
        <div className="rounded-xl border border-par-3-punch/30 bg-white p-4 space-y-2">
          <h2 className="text-lg font-semibold text-mowing-green">
            Characteristic guidance
          </h2>
          <p className="text-sm text-mowing-green/80">
            {result.mode === "CHARACTERISTIC_GUIDANCE"
              ? "Not enough independent head-fit evidence for named rankings yet."
              : "No catalogue heads cleared the defensive gates for this session."}
          </p>
          <ul className="list-disc pl-5 text-sm text-mowing-green/80 space-y-1">
            {g.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="text-sm text-mowing-green/70">
            Direction: {g.directional_requirement}. Head launch:{" "}
            {g.head_launch_target}. Forgiveness target:{" "}
            {g.forgiveness_requirement ?? "unresolved"}.
          </p>
        </div>
      )}

      <section className="rounded-xl border border-mowing-green/15 bg-white p-4 space-y-2">
        <h2 className="text-lg font-semibold text-mowing-green">
          Shaft profile guidance
        </h2>
        {!shaft.available ? (
          <p className="text-sm text-mowing-green/70">
            Add swing speed or carry to refine flex and weight.
          </p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-mowing-green/80 space-y-1">
            {shaft.flex_label ? <li>{shaft.flex_label}</li> : null}
            {shaft.weight_label ? <li>{shaft.weight_label}</li> : null}
            {shaft.launch_label ? <li>{shaft.launch_label}</li> : null}
          </ul>
        )}
        <ul className="list-disc pl-5 text-xs text-mowing-green/60 space-y-1">
          {shaft.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      {result.mode === "NAMED_HEADS" &&
        result.recommendations.map((rec) => {
          const attach = result.inventory_attachments?.find(
            (a) => a.catalogue_key === rec.catalogue_key
          );
          const items = attach?.items ?? [];
          return (
            <section
              key={`inv-${rec.catalogue_key}`}
              className="rounded-xl border border-dashed border-mowing-green/25 p-4 space-y-2"
            >
              <h2 className="text-sm font-semibold text-mowing-green">
                Available on Teevo —{" "}
                {rec.display_name ||
                  [rec.brand, rec.model].filter(Boolean).join(" ")}
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-mowing-green/70">
                  No matching Teevo listings for this model right now (correct
                  handedness and unique identity required). Equipment
                  recommendation above still applies.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((row) => (
                    <li
                      key={row.item.source_listing_id}
                      className="rounded-lg border border-mowing-green/15 bg-white px-3 py-2 text-sm"
                    >
                      <a
                        href={`/listing/${row.item.source_listing_id}`}
                        className="font-semibold text-mowing-green underline"
                      >
                        £{(row.item.price_minor / 100).toFixed(2)}
                      </a>
                      <span className="text-mowing-green/70">
                        {" "}
                        · {row.item.condition || "Condition n/a"} ·{" "}
                        {row.item.availability_status}
                      </span>
                      {row.unverified_shaft ? (
                        <p className="text-xs text-par-3-punch mt-1">
                          Shaft identity unverified — configuration not fully
                          matched.
                        </p>
                      ) : null}
                      {row.listing_match ? (
                        <p className="text-xs text-mowing-green/70 mt-1">
                          Listing Match: {row.listing_match.match_band.replace(/_/g, " ")}{" "}
                          · {row.listing_match.confidence} confidence
                        </p>
                      ) : row.attach_mode === "HEAD_ONLY" &&
                        !row.unverified_shaft ? (
                        <p className="text-xs text-mowing-green/60 mt-1">
                          Listed for this head — full Match badge not available.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

      {result.mode !== "NAMED_HEADS" ? (
        <section className="rounded-xl border border-dashed border-mowing-green/25 p-4">
          <h2 className="text-sm font-semibold text-mowing-green">
            Available on Teevo
          </h2>
          <p className="text-sm text-mowing-green/70 mt-1">
            Inventory is shown alongside named head recommendations when
            available.
          </p>
        </section>
      ) : null}

      <details className="text-xs text-mowing-green/60">
        <summary className="cursor-pointer font-semibold">Admin audit</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-mowing-green/5 p-3">
          {JSON.stringify(
            {
              session: result.session,
              audit: result.audit,
              versions: result.versions,
              handedness: g.handedness,
            },
            null,
            2
          )}
        </pre>
      </details>

      <Link
        href="/admin/match/questionnaire"
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-mowing-green px-5 text-sm font-semibold text-mowing-green"
      >
        Revise answers
      </Link>
    </div>
  );
}
