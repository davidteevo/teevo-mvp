# MATCH_HEAD_CONFIG_OVERLAY_V1

Versioned recommendation-family overlay for Teevo Match catalogue selection.

## Purpose

Group verified standard / HL configuration pairs into recommendation families so Match returns at most one top-level card per family, without merging Fit scores, catalogue identity, or inventory attach keys.

## Source of truth

- Overlay file: `reference/head-config-overlay.v1.json`
- Loader: `lib/match/head-config-overlay.ts`
- Insertion: family dedupe after presentation sort inside `rankCatalogueHeads`; B2.1 differentiation on top-tied **families**

Frozen `heads.json` / `shafts.json` are **not** modified.

## Mapping (V1)

| Catalogue key | Family key | Selectable | Hold |
|---|---|---|---|
| `ping\|g430-max\|2023` | `ping\|g430-max\|2023` | yes | — |
| `ping\|g430-max-hl\|2023` | `ping\|g430-max\|2023` | **no** | `HL_COMPLETE_BUILD_NOT_HEAD_ISOLATED` |
| `ping\|g440-max\|2025` | `ping\|g440-max\|2025` | yes | — |
| `ping\|g440-max-hl\|2025` | `ping\|g440-max\|2025` | **no** | `HL_COMPLETE_BUILD_NOT_HEAD_ISOLATED` |
| `ping\|g440-k\|2026` | `ping\|g440-k\|2026` | yes | — |
| `ping\|g440-k-hl\|2026` | `ping\|g440-k\|2026` | **no** | `HL_COMPLETE_BUILD_NOT_HEAD_ISOLATED` |
| `taylormade\|qi10-max\|2024` | `taylormade\|qi10-max\|2024` | yes | — |
| `taylormade\|qi10-max-hl\|2024` | `taylormade\|qi10-max\|2024` | **no** | `UK_UNVERIFIED` |

Unmapped heads: family key = catalogue key; selectable.

## Why HL configs are held from head-only recommendations

Catalogue Fit scores only head characteristics (forgiveness, stability, workability, direction, head_launch). Shaft, grip, length and system weight are inactive.

PING HL SKUs are manufacturer **lightweight builds**. Frozen notes attribute HIGH launch and lighter rearweight to the HL *build*, not to isolated head-only launch evidence. A different frozen `launch_tendency` therefore must **not** be read as proof that the head alone outperforms the standard model in Teevo’s head-only engine.

HL catalogue identities remain exact for listing recognition and future configuration-aware matching. They simply cannot win a top-level catalogue recommendation card under this overlay.

Qi10 Max HL additionally remains held for `UK_UNVERIFIED`.

## Explicit non-collapses

- `ping|g430-max|2023` vs `ping|g430-max-10k|2024`
- G440 MAX vs G440 K; MAX vs SFT; Qi10 / Qi10 Max / Qi10 LS; generations; Draw/Tour unless mapped

## Inventory (V1)

Exact `catalogue_key` attach only. No family-sibling inventory attachment.

## Differentiation (B2.1)

See `PHASE_2A.md` / quality-gate plan: after family dedupe, allow ≤3 top-tied families under incomplete coverage; block when >3 families share the top Fit tier with fewer than five active dims on that tier; full five-dim top-tied coverage may still show a tied shortlist with disclosure.

## Phase 2E.1 lightweight / package review (targeted)

Reviewed `cleveland|launcher-xl-lite-draw|2022` because it appears in Phase 2E named stacks and uses “Lite” / ultralight positioning with HIGH/HIGH launch.

| Finding | Detail |
|---|---|
| Catalogue identity | Distinct fixed-hosel draw sibling (not a STANDARD/HL pair of the same head). |
| Launch evidence | HIGH launch attributed to positioning for an ultralight draw package; not the same isolation failure pattern as PING HL complete builds. |
| Overlay action | **No new hold** in Phase 2E.1 — insufficient model-specific proof that head-only launch cannot be scored. |
| Preserved holds | PING G430/G440/G440-K HL (`HL_COMPLETE_BUILD_NOT_HEAD_ISOLATED`); Qi10 Max HL (`UK_UNVERIFIED`). |

Do not expand Lite/HL/Air keyword research across the frozen catalogue without further model-specific evidence.

## Out of scope

UK register import, frozen score edits, three-choice selector, sibling inventory, public Match enablement, Supabase migrations.
