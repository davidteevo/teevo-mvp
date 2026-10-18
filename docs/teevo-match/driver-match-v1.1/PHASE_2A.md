# Teevo Match Phase 2A — product-authorized notes

Status: Checkpoint A hardening + Checkpoint B inventory attach implemented (admin-only). Does not modify frozen DRIVER_V1 / SHAFT_V1 extracts or Phase 1 golden fixtures. Public Match remains disabled; `match_enabled` migration unapplied.

## Authorized override

Phase 1 deferred catalogue-only unavailable-model recommendations. Phase 2A authorizes a **separate** catalogue suitability pathway:

- Ranks Match-eligible STANDARD heads using **head characteristic Fit only**
- Results use `CatalogueHeadScore` / `CatalogueRecommendResult` — never listing `CandidateScore`
- Catalogue cards are **non-purchasable** model-level recommendations
- Admin preview is independent of public `match_enabled`

## Catalogue Fit scope

| Dimension | Catalogue pathway |
|---|---|
| forgiveness, stability, workability, direction, head_launch | Scored with Phase 1 curves (shared helper) |
| loft | **Omitted** (`CATALOGUE_NO_CONFIGURATION`) — preferred loft is guidance only |
| flex, weight, shaft_launch | **Omitted** — shaft profile guidance from requirements only |
| listing confidence / listing Fit | Not applicable |

## Minimum evidence gate (documented decision)

Before scoring for named heads:

1. Session must have ≥ **2** catalogue-scorable requirement dimensions whose `requirement_confidence` band is not `UNRESOLVED` and whose `source_codes` include at least one code **other than** `BASELINE`. Pure baseline forgiveness/stability/workability alone does **not** unlock named rankings.
2. Each candidate head must have ≥ **2** active catalogue Fit dimensions after scoring.
3. Band ≥ `GOOD_MATCH`, presentation confidence ≥ `MEDIUM`, not suppressed.

If (1) fails → mode `CHARACTERISTIC_GUIDANCE`.  
If (1) passes but no head clears (2)/(3) → mode `NO_DEFENSIBLE_HEADS`.

**Independence note:** Dimensions are counted as independent Fit components (separate equipment fields). This is a Phase 2A presentation gate, not a Logic V1.2 weight change.

## Meaningful head differentiation gate (deterministic)

Direction and/or head_launch being unresolved does **not** by itself suppress named recommendations.

After building the qualifying set `Q` (heads that pass gates 2–3 above):

1. If `|Q| = 0` → `NO_DEFENSIBLE_HEADS`.
2. Let `distinct_fits` = the set of exact `catalogue_fit_score` values in `Q` (IEEE equality; no epsilon).
3. Let `max_active` = maximum `active_catalogue_dim_count` among heads in `Q`.
4. Let `top_fit` = maximum `catalogue_fit_score` in `Q`.
5. Let `top_fit_share_count` = number of heads in `Q` with `catalogue_fit_score === top_fit` (exact).

**No meaningful differentiation** when `|Q| > 0` and either:

- **(A)** `|distinct_fits| = 1` **and** `max_active < 5` — entire qualifying pool is a single Fit with incomplete characteristic coverage; or
- **(B)** `max_active < 5` **and** `top_fit_share_count > 3` — incomplete coverage and the top Fit is shared by more than three heads, so the displayed top-3 would be presentation-ordered clones rather than Fit-differentiated picks.

Rationale (reuses existing scores / active-dim counts only — no new curves or weights): unresolved direction or launch alone does **not** suppress names; suppression requires a flat or top-crowded Fit landscape under incomplete characteristic coverage.

When `|distinct_fits| = 1` and `max_active = 5`, named heads **are** allowed (full characteristic coverage; presentation tie-break among true clones).

Audit code: `NO_MEANINGFUL_HEAD_DIFFERENTIATION`.

### Profile expectations

| Profile class | Expected mode |
|---|---|
| Sparse (handedness only) | `CHARACTERISTIC_GUIDANCE` (evidence-backed dims gate) |
| Sparse incomplete flight/speed with many equal top Fits on ≤4 active dims | `CHARACTERISTIC_GUIDANCE` via (A) or (B) |
| Rich (speed + flight + miss pattern, 5 active dims) | `NAMED_HEADS` |
| Borderline (e.g. direction unresolved, launch active) | `NAMED_HEADS` if not (A)/(B); else guidance |

## Presentation ranking (Fit unchanged)

Sort qualifying heads for display only:

1. `catalogue_match_band` descending (EXCELLENT → GOOD)
2. `catalogue_fit_score` descending
3. **Exact Fit tie** (same band and identical Fit score): `release_year` descending (missing/non-finite year → `0`), then `catalogue_key` ascending

Never modify `catalogue_fit_score`. Do **not** use a numeric epsilon / 0.05 band for ties — only exact equality.

## Presentation confidence

Catalogue `head_recommendation_confidence` = renormalised golfer (0.45) + equipment (0.35) only. Listing term omitted. This is **not** Logic §38 overall confidence.

## Explanations

Explanations must be qualified: model-level suitability only; loft and shaft not scored for catalogue cards; no invented yardage or specs. When `active_catalogue_dim_count < 5`, call out incomplete characteristic coverage.

## Handedness / configuration

Catalogue recommendations are **model-level suitability only**. They do not prove a handedness, loft, or shaft configuration exists.

## Checkpoint B — inventory attach

- Attach only when head identity is **UNIQUE** and listing handedness **equals** golfer handedness (confirmed).
- Ambiguous head or unknown/conflicting handedness → do not attach.
- **Head-only** attach (UNIQUE head, shaft unresolved): show price, condition, availability + explicit **unverified shaft** label; no full listing Match badge.
- **Full listing Match badges** only when Phase 1 configuration evidence allows successful `scoreCandidate` (resolved eligible shaft, usable loft, purchasable, etc.).
- Reuse `isListingPurchasable` and existing listing detail / purchase flows. No checkout changes.
- Empty inventory must not fail catalogue recommendations.
- Public Match remains disabled; `match_enabled` migration unapplied.

## Analytics

Checkpoint A/B admin preview must not emit consumer conversion events that contaminate future Match→purchase metrics.

## Versions

Catalogue pathway stamp: `PHASE_2A_CHECKPOINT_A` (hardening) / results may note inventory attach as Checkpoint B without changing Phase 1 contract/logic versions.
