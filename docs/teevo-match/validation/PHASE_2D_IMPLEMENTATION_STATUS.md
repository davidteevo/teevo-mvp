# Phase 2D implementation status — final

Public Match remains **disabled**. Frozen DRIVER_V1 / SHAFT_V1 unchanged. Exact-key inventory attach unchanged. No Supabase/RLS migrations. No three-choice categories.

---

## Milestone A — B2.1 mixed-coverage (complete)

Crowded top-Fit ties (`>3` distinct families) require **every** top-tied family winner to have `active_catalogue_dim_count >= 5` (`top_tied_min_active_dims`, not max).

| Case | Result |
|---|---|
| ≤3 top-tied, 4 dims | allow |
| >3 top-tied, all 5 dims | allow + tie disclosure |
| >3 top-tied, one 5 + many 3 | **block** |
| >3 top-tied, mix 4 and 5 | **block** |

---

## Milestone B — UK market relevance (complete)

### Reconciliation (CSV ↔ repository `heads.json`)

| Check | Result |
|---|---|
| Frozen DRIVER catalogue keys | **619** |
| CSV rows matched | **619** |
| Missing / unmatched keys | **0** |
| Duplicate keys | **0** |
| `market_code` | **GB** on all rows (no rewrite) |
| `driver_subtype` / `release_year` vs freeze | **0 mismatches** |
| Status / review enums | valid |

### Market status counts

| Status | Count | Expected |
|---|---|---|
| UK_ESTABLISHED | 186 | 186 |
| UK_OBSERVED | 225 | 225 |
| UK_UNVERIFIED | 207 | 207 |
| REGION_RESTRICTED | 1 | 1 |

Review: REVIEWED **410**, NEEDS_REVIEW **209**, NOT_REVIEWED **0**.

### Eligibility intersection

| Metric | Count | Expected |
|---|---|---|
| STANDARD + `match_eligible` + REVIEWED + ESTABLISHED/OBSERVED | **395** | 395 |
| After known HL config holds | **394** | 394 |

`ping|g440-k-hl|2026` is UK_ESTABLISHED+REVIEWED but remains non-selectable via config overlay (`HL_COMPLETE_BUILD_NOT_HEAD_ISOLATED`).

Artifacts:

- [`reference/uk-head-relevance.v1.json`](../driver-match-v1.1/reference/uk-head-relevance.v1.json)
- [`research/UK_HEAD_RELEVANCE_RECONCILIATION.md`](../driver-match-v1.1/research/UK_HEAD_RELEVANCE_RECONCILIATION.md)

### Runtime integration

UK eligibility applied with config holds **before** family dedupe and B2.1. Fit scores unchanged. ESTABLISHED not ranked above OBSERVED. Missing/invalid overlay → `CHARACTERISTIC_GUIDANCE` / `UK_MARKET_OVERLAY_UNAVAILABLE`.

---

## Profile checkpoints (24 fixtures)

| Checkpoint | Named | Guidance | Notes |
|---|---|---|---|
| B — after B2.1 min | 15 | 9 | Pre-UK baseline for this session |
| C — after UK gate | **17** | **7** | UK filter applied |

Checkpoint A (pre-min B2.1) was not separately frozen in-session; B is the post-hardening baseline.

### B → C coverage

- **Lost named:** none.
- **Gained named (2):** `low_handicap_low_spin`, `low_ball_flight` — previously blocked by B2.1 crowded incomplete top-tier (`tied≈51`, `min_active=4`). After UK holds remove non-UK heads, remaining top-tied families all have 5 active dims (`tied≈34`, `min=5`) → named allowed. Gates were not loosened.
- **Changed head sets (still named):** 11 profiles — non-UK (or lower-ranked after UK filter) heads dropped; UK-eligible heads filled slots. Examples: Tour Edge Lite/Hot Launch sets replaced by Cleveland/Wilson UK-eligible alternatives on forgiveness/high-launch profiles.
- **Unchanged named keys:** 4 profiles (`rich_right_miss`, `incomplete_launch`, `mid_fade_bias`, `mid_control`).

JSON: `phase2d-profile-checkpoint-B.json`, `phase2d-profile-checkpoint-C.json`.

---

## Tests

| Suite | Result |
|---|---|
| Overlay + B2.1 + UK unit | PASS |
| Phase 1 / 2A / 2B / verification | PASS (**79** tests) |
| `tsc --noEmit` | clean |
| Phase 1 harness | PASS |

---

## Remaining risks / follow-ups

1. **209 NEEDS_REVIEW** heads stay held — coverage may grow when research completes; do not relax gates for completeness.
2. UK filter changes *which* UK-eligible heads appear; some rich profiles still guidance when top-tied incomplete after UK filter (`mid_handicap_distance`, `faster_swing_high_flight`, `high_ball_flight`, sparse profiles). Separate recommendation-quality review — do not auto-loosen B2.1.
3. Checkpoint A pre-min baseline not archived; compare future work to B/C artifacts.
4. Three-choice categories and public Match activation remain out of scope.

---

## Controls confirmation

- Frozen heads/shafts: **unchanged**
- Exact-key inventory attach: **unchanged**
- Public Match: **disabled**; `match_enabled` migration **unapplied**
- No sibling inventory / retailer integrations / three-choice categories
