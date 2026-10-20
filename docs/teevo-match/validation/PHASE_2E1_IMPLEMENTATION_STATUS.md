# Phase 2E.1 — Implementation Status

**Status:** Implemented (product-amended plan). Public Match remains disabled.

**Audit record:** [PHASE_2E_QUALITY_AUDIT.md](./PHASE_2E_QUALITY_AUDIT.md)  
**Checkpoint:** [phase2e1-profile-checkpoint-D.json](./phase2e1-profile-checkpoint-D.json) (UK gate on) vs C.

## What shipped

1. **Assessed-scope UX** — named cards always show N of 5 characteristics; loft/shaft not scored; incomplete evidence pinned in Uncertainty; language avoids “complete custom club fitting.”
2. **Material UNKNOWN-launch filter** — when launch is material (`PRIMARY_OBJECTIVE` flight goal or non-neutral `TRAJECTORY`, confidence MEDIUM/HIGH), heads with `EQUIPMENT_EVIDENCE_UNRESOLVED` launch are removed from the qualifying pool **before** family dedupe and B2.1. MID-only / unresolved launch requirements do not filter.
3. **Soft equal-Fit shortlist** — among exact band+Fit ties, prefer more complete coverage and assessed-characteristic variety, then year/key. No hard clone suppression; no UK ESTABLISHED preference; global `compareCataloguePresentationOrder` unchanged.
4. **Guidance copy** — crowded B2.1 explains why named heads are withheld; nudges existing start/curve/miss-reduction fields.
5. **Lite Draw** — documented review; no new hold ([HEAD_CONFIG_OVERLAY_V1.md](../driver-match-v1.1/HEAD_CONFIG_OVERLAY_V1.md)).
6. **Inventory fixtures** — exact key, LEFT/RIGHT, unknown/conflict, HEAD_ONLY, hard FULL_LISTING_MATCH, non-purchasable, empty inventory.

## Checkpoint C → D (UK on)

| Metric | C | D |
|---|---|---|
| Named / guidance | 17 / 7 | **19 / 5** |
| Fit scores for shared keys | — | unchanged |

**Mode gains (side effect of material launch filter, not gate relax):** `faster_swing_high_flight`, `high_ball_flight` — HIGH trajectory is material; UNKNOWN-launch incomplete peers leave the top tier so B2.1 min active dims rises to 5.

**Soft-diversity key shifts (Fit unchanged):** `mid_control`, `low_handicap_low_spin`, `low_ball_flight`, `borderline_forgiveness` (SIM Max before Exotics Max via higher active dims).

**Unchanged focus stacks:** `beginner_forgiveness`, `slower_swing_high_launch`, `toe_miss_moderate` (Exotics Max retained under MID-only / non-material launch).

## Validation

- `npx vitest run lib/match/` — 90 passed
- `npx tsc --noEmit` — pass
- `npm run match:harness` — PASS
- Public Match: `public_match_enabled: false` in admin recommend route

## Phase 2F readiness

Do **not** start Phase 2F until product reviews checkpoint D (especially newly named high-flight profiles and remaining UNKNOWN-launch cards under non-material MID trajectory).
