"use client";

import { useState } from "react";
import {
  answersToApiPayload,
  loadMatchAnswers,
  saveMatchResult,
} from "@/lib/match/app/session-storage";
import type { CatalogueRecommendResult } from "@/lib/match/catalogue-types";

type Props = {
  onResult: (result: CatalogueRecommendResult) => void;
};

export function BrandFilterEmpty({ onResult }: Props) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function clearFilter() {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/match/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToApiPayload(loadMatchAnswers()) }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        setFailed(true);
        setPending(false);
        return;
      }
      saveMatchResult(
        data.result,
        data.inventory_status === "unavailable" ? "unavailable" : "ready"
      );
      onResult(data.result as CatalogueRecommendResult);
      setPending(false);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="brand-filter-empty-title">
      <p className="text-xs font-medium uppercase tracking-wide text-par-3-punch">
        Teevo Fit
      </p>
      <h1
        id="brand-filter-empty-title"
        className="text-xl font-semibold text-mowing-green sm:text-2xl"
      >
        No suitable drivers in the selected brands
      </h1>
      <p className="text-sm leading-5 text-mowing-green/80">
        None of the selected brands met the suitability checks for these answers.
        Clear the brand filter to look across every eligible driver.
      </p>
      <button
        type="button"
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-mowing-green px-5 text-sm font-semibold text-off-white-pique disabled:opacity-60"
        disabled={pending}
        onClick={() => {
          void clearFilter();
        }}
      >
        Clear brand filter
      </button>
      {failed ? (
        <p className="text-sm text-mowing-green/80">
          The brand filter could not be cleared. Your current results are unchanged.
        </p>
      ) : null}
    </section>
  );
}
