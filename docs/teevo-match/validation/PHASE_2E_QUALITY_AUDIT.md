# Phase 2E — Recommendation Quality & Real-World Fitting Validation

**Status:** Approved audit record (Phase 2E complete). This document preserves checkpoint-C findings.

**How to read this document:**
- Sections 1–8 and the profile table are **confirmed observations** from synthetic fixtures and code review.
- Section 9 separates **confirmed technical trust issues** (P0) from **product-quality recommendations** (P1–P2). Proposed fixes are **not** automatically approved.
- Phase 2E.1 implements a reviewed, product-amended subset of those recommendations.

**Sources of truth:** checkpoint JSON B/C, `scripts/match-profile-checkpoint.ts` fixtures, frozen `heads.json`, `uk-head-relevance.v1.json`, scoring in `catalogue-head.ts` / `head-dimensions.ts`. These are **synthetic fixture outcomes**, not live-user metrics. Checkpoint fixtures include **no Teevo inventory**, so attach coverage is unverified here.

---

## 1. Executive summary

**Technically:** Named recommendations are eligible under current gates (Fit, UK REVIEWED ESTABLISHED/OBSERVED, config holds, family dedupe, B2.1). Automated tests remain green. No eligibility bypass found.

**Fitting:** Several stacks are directionally coherent (slice → STRONG_DRAW high-launch; right-miss → G430 SFT + offset). Recurring weaknesses: (a) three near-identical draw/high-MOI cards; (b) brand-new **2026** models elevated by year tie-break despite thin UK used market; (c) heads with **UNKNOWN** launch still named; (d) catalogue path cannot score loft/shaft — explanations disclose this but named cards can still over-signal confidence.

**UK second-hand:** B→C removals were consistently `UK_UNVERIFIED` + `NEEDS_REVIEW` (correct). Replacements are market-eligible but not “currently listed / priced.” ESTABLISHED/OBSERVED ≠ stock or value.

**Guidance (7/24):** Six are justified B2.1 crowded incomplete top-ties; one is correct insufficient-evidence. Highest product friction: “normal” mid-handicap distance / high-flight / carry profiles blocked despite rich answers.

**Before three-choice:** Fix or explicitly accept P0/P1 items below. Do **not** claim Best Value without pricing. Do **not** relax B2.1 or UK holds to boost coverage.

**Answers to completion questions:**

1. **Technically defensible?** Yes for gate-passing named sets; caveats on UNKNOWN launch and incomplete dims.
2. **Credible as real-world fitting?** Mixed — coherent for slice/forgiveness; weak diversity; 2026/niche picks over-represented.
3. **UK 2H relevant?** Passes overlay by design; not proof of availability or liquidity.
4. **Why seven guidance?** Six B2.1; one evidence gate — see §6.
5. **Meaningfully different threes?** Often no — same Fit/band/profile cluster.
6. **Before three-choice?** Address P0/P1 (direction QA, UNKNOWN launch presentation, diversity/tie policy, guidance UX for crowded ties).

---

## 2. Coverage snapshot (checkpoint C)

| Metric | Value |
|---|---|
| Named / guidance | **17 / 7** (71% / 29%) |
| Returning 3 / 2 / 1 / 0 heads | 17 / 0 / 0 / 7 |
| Unchanged named keys vs B | 4 |
| Changed named keys vs B | 11 |
| Gained named vs B | 2 |
| Lost named vs B | **0** |
| Inventory attached in fixtures | **0** (not exercised) |

Crowded ties remain common among guidance profiles (e.g. `mid_handicap_distance` tied=61, min_active=4). Named `mid_control` allows 44-way full-coverage tie then presentation-slices to three 2026 heads at Fit 100.

---

## 3. Twenty-four profile audit (checkpoint C)

| Profile | Inputs (abbrev) | Mode | Keys (Fit / dims) | UK / notes | Quality |
|---|---|---|---|---|---|
| beginner_forgiveness | 28hcp 78mph LOW R/R HEEL FORGIVENESS | NAMED | Cleveland XL Lite Draw, Wilson Launch Pad 2, Cleveland HB Turbo Draw (~97.4/5) | EST/OBS; STRONG_DRAW HIGH | Coherent slice+launch; **near-identical trio** |
| high_handicap_slice | 22 85 REDUCE_RIGHT_MISS | NAMED | Adams XTD, Wilson DYNAPWR Ti, Qi35 Max | OBS/EST DRAW | Plausible; diversification fair |
| mid_handicap_distance | 14 95 DISTANCE | GUIDANCE | — B2.1 tied 61 min4 | — | Justified gate; high friction |
| mid_handicap_hook | 12 98 REDUCE_LEFT_MISS | NAMED | JPX ONE SELECT (FADE), G LS Tec, Exotics LS | EST/OBS | Direction OK for hook; **2026** heavy |
| low_handicap_workability | 4 110 CONTROL | NAMED | Honma TW747, Epic Max LS, ST-Z 230 (~99/4) | OBS | Players/LS-ish; 4 dims incomplete |
| low_handicap_low_spin | 2 115 LOW DISTANCE | NAMED | Quantum Max, TW777, ZXi RKT (100/5) | OBS/EST | Gained via UK+B2.1; **three 2026** near-ties |
| faster_swing_high_flight | 8 108 HIGH | GUIDANCE | B2.1 tied 47 min4 | — | Justified |
| slower_swing_high_launch | 20 72 FORGIVENESS | NAMED | Same draw stack as beginner | — | Same diversity issue |
| rich_right_miss | 10 95 R/R | NAMED | G430 SFT, AMP Offset, 913D2 | EST/OBS | Strong directional fit; **unchanged** |
| borderline_forgiveness | 18 92 FORGIVENESS | NAMED | Exotics Max (100/**3**), SIM Max, VR_S Covert | EST/OBS | **UNKNOWN launch** on #1; incomplete dims |
| incomplete_launch | 16 traj UNKNOWN | NAMED | G SF Tec, OPTM MAX-D, DS-ADAPT MAX-D | EST | Draw/high; launch req weak; **unchanged** |
| sparse_incomplete | mostly UNKNOWN | GUIDANCE | B2.1 tied 217 @3 dims | — | Justified |
| sparse_handedness_only | RIGHT only | GUIDANCE | INSUFFICIENT_EVIDENCE… | — | Justified |
| mid_fade_bias | L start R curve REDUCE_RIGHT_MISS | NAMED | 913D2, Aerojet, PXG 0211 (DRAW) | EST/OBS | **Correct** for reduce-right (draw assist)—fixture name is misleading |
| senior_slower | 24 68 FORGIVENESS | NAMED | Same as slice stack | — | OK |
| strong_draw_assist | 19 88 REDUCE_RIGHT_MISS | NAMED | Same as slice | — | OK |
| mid_control | 9 102 CONTROL | NAMED | Quantum TD Max, Lightning Tour Mid, Qi4D (100/5) | OBS/EST | **44-way tie**; three 2026 “players” clones |
| high_ball_flight | 15 93 HIGH | GUIDANCE | B2.1 tied 12 min4 | — | Justified; painful for clear intent |
| low_ball_flight | 7 105 LOW | NAMED | Same as low_spin trio | — | Gained named; year-tie 2026 cluster |
| toe_miss_moderate | 13 TOE FORGIVENESS | NAMED | SIM Max, Exotics Max, Covert | — | Forgiveness OK; Exotics launch UNKNOWN |
| distance_seeker_unknown_satisfaction | 17 DISTANCE | NAMED | Vice VGD01+, 915D3, 913D2 | EST/OBS | Niche + legacy players mix |
| inconsistent_strike | VARIABLE | GUIDANCE | B2.1 tied 125 @3 | — | Justified |
| mid_handicap_carry_hint | 12+carry DISTANCE | GUIDANCE | B2.1 tied 80 min4 | — | Justified; carry unused for catalogue head Fit |
| rich_left_start | 6 L/L CONTROL | NAMED | JPX ONE (FADE), Vice, 915D3 | — | Fade head for left miss plausible |

---

## 4. Eleven B→C recommendation changes

**Mechanism:** UK gate removed `UK_UNVERIFIED`+`NEEDS_REVIEW` winners (Yonex, Bridgestone BX, Tour Edge Lite/Hot Launch, Yamaha, PowerBilt, PXG 0811 LX Gen1, PRGR, etc.). Presentation order then promoted next UK-eligible family winners. Fit scores themselves unchanged.

| Profile | Removed (UK hold) | Entered / kept | Verdict |
|---|---|---|---|
| beginner / slower_swing | Tour Edge Lite/Hot Launch (UNVERIFIED) | Cleveland/Wilson draw high-launch | **Better UK credibility**; still clone trio |
| slice / senior / strong_draw | Yonex / Bridgestone (UNVERIFIED) | Wilson DYNAPWR / Qi35 Max | Credible UK brands; similar MOI/draw story |
| mid_handicap_hook | Cobra LTD Pro / Bridgestone LS (UNVERIFIED) | G LS Tec, Exotics LS + JPX | More UK-plausible; still low-spin/players cluster |
| low_handicap_workability | Yamaha RMX (UNVERIFIED) | Mizuno ST-Z | Reasonable |
| borderline / toe_miss | PowerBilt (UNVERIFIED) | Nike Covert | OK legacy MOI; not “misleading” vs prior |
| distance_seeker | PXG 0811 / Bridgestone BX1ST | Titleist 915/913 | More recognizable UK used; older players |
| rich_left_start | Yonex / PRGR | Vice + Titleist 915 | UK-eligible; niche Vice remains |

No changed set is a clear **technical regression**. Main risk is commercial/niche replacements (Vice, Tour Edge Exotics Max, 2026 JPX) looking like “current UK used staples” when they are only research-eligible.

---

## 5. Seven guidance outcomes — root causes

| Profile | Blocker | Justified? | Avoidable friction? |
|---|---|---|---|
| sparse_handedness_only | Insufficient evidence-backed dims | Yes | No — need questionnaire |
| sparse_incomplete | B2.1: 217 top-tied @ 3 dims | Yes | Soften copy only |
| inconsistent_strike | B2.1: 125 @ 3 dims | Yes | Prompt for clearer strike/flight |
| mid_handicap_distance | B2.1: 61 tied, min_active 4 | Yes technically | **High** — “normal” golfer blocked |
| mid_handicap_carry_hint | B2.1: 80 tied, min 4 | Yes; carry not a catalogue head dim | High — carry unused |
| faster_swing_high_flight | B2.1: 47 tied, min 4 | Yes | High |
| high_ball_flight | B2.1: 12 tied, min 4 | Yes | Medium–high |

**Smallest interventions (no gate relax):** clearer guidance explaining crowded incomplete ties; optional “show illustrative UK-eligible examples with strong incomplete-coverage disclaimer” as a **separate** presentation mode (needs product approval — not default named Fit cards); improve questionnaire to activate 5th dim where possible.

---

## 6. Fitting credibility findings

**Strengths**

- Direction mapping for `REDUCE_RIGHT_MISS` → draw assist is consistent ([`requirements.ts`](lib/match/requirements.ts)); `rich_right_miss` / beginner draw stacks are fitter-sensible.
- Hook profiles receiving FADE / LS heads is directionally sound.
- Model-level + loft/shaft-omitted disclosures exist in explain/UI.

**Concerns**

- **Clone cards:** three STRONG_DRAW HIGH heads with identical Fit (beginner/slower).
- **Year-driven 2026 clusters** at Fit 100 (`mid_control`, low_spin/low_flight) — thin UK used evidence.
- **UNKNOWN launch** (`tour-edge|exotics-max|2026`) still named with high Fit when other dims carry score.
- **4-dim named cards** (`low_handicap_workability`, parts of borderline) — incomplete characteristic coverage despite naming.
- Loft/shaft inactive → forgiveness/launch “wins” can overstate complete-club suitability (already held for HL configs; same principle applies broadly).

---

## 7. Diversity assessment (pre–three-choice)

Supported **today** with existing evidence:

- Distinct Fit scores / bands among shortlist.
- Distinct directional profiles (DRAW vs FADE vs NEUTRAL) when present.
- Distinct families (already enforced).
- Generational spread when Fits differ.

**Not** supportable yet as product claims:

- Best Value (no defensible 2H pricing).
- “Newer Alternative” as a Fit claim (year is presentation tie-break only).
- Three meaningfully different fitting strategies when Fits are identical.

Honest UI may return **1–2** cards when remaining UK-eligible options are clones; force-filling to three harms trust.

---

## 8. UK second-hand relevance

| Layer | Meaning |
|---|---|
| Technically suitable | Catalogue Fit gates |
| UK overlay ESTABLISHED/OBSERVED + REVIEWED | Historical/observed UK presence |
| Teevo listed | Exact-key attach (not in these fixtures) |
| Verified price | Not in Match catalogue path |

**Questionable as “initial marketplace showcase” despite UK pass:** brand-new 2026 OBSERVED heads, Vice, Tour Edge Exotics Max (UNKNOWN launch), Honma TW777. Prefer recognizable UK used brands when Fits are tied — **presentation policy**, not Fit mutation.

---

## 9. Prioritised issue log

### P0 — Trust / correctness

| ID | Finding | Smallest fix | Type |
|---|---|---|---|
| P0-1 | Named recommendations with **UNKNOWN** / unresolved launch (or other critical dim inactive) still presented without hard stop | Require active `head_launch` when launch preference resolved; or suppress/demote UNKNOWN-launch heads from named cards | Code + explain |
| P0-2 | Risk of overstating confidence on 3–4 active-dim named cards | Strengthen mandatory incomplete-coverage banner; consider min active dims ≥4 for named (or ≥5 when direction+launch both resolved) — **product decision**; do not silently change Fit | Code / UX |

*(No eligibility bypass or identity corruption found. mid_fade_bias DRAW stack is **not** P0 — objective is REDUCE_RIGHT_MISS.)*

### P1 — Product quality

| ID | Finding | Smallest fix | Type |
|---|---|---|---|
| P1-1 | Near-identical three-card draw/MOI clones | Soft diversity: prefer distinct directional_bias / primary_head_profile / generation when Fits equal | Code (presentation) |
| P1-2 | Year tie-break over-weights brand-new heads | Cap or de-prioritise release_year when Fit tied among UK_OBSERVED very-new models; or prefer ESTABLISHED in ties (**not** a Fit bonus — presentation only) | Code |
| P1-3 | Mid-handicap distance/high-flight/carry → guidance | UX: explain B2.1; optional illustrative list with disclaimer; questionnaire nudges for missing dims | UX / copy |
| P1-4 | Carry distance unused in catalogue Fit | Document; optional future dim — not Phase 2E fix | Docs / future |
| P1-5 | Fixture inventory never attached | Add inventory-backed profile checks before three-choice | Tests |
| P1-6 | Rename/clarify `mid_fade_bias` fixture (fade shape vs fade assist) | Test hygiene | Tests |

### P2 — Future

Shaft-aware catalogue path; pricing/Best Value; retailer feeds; three-choice categories; broader NEEDS_REVIEW clearing; richer launch evidence for Tour Edge etc.

---

## 10. Recommended work before three-choice (Phase 2F entry gate)

Proceed to three-choice **only when**:

1. P0-1 addressed (UNKNOWN launch / critical inactive dims policy).  
2. Explicit product decision on P0-2 / incomplete-dim named cards.  
3. Soft diversity or honest ≤2-card shortlists for clone ties (P1-1).  
4. Guidance UX for crowded B2.1 cases (P1-3) without relaxing gates.  
5. At least one inventory-attached profile suite (P1-5).  
6. Written rule: **no Best Value** without pricing evidence; year ≠ Fit superiority.

**Out of scope until separate approval:** Fit weight changes, UK gate loosening, frozen data edits, public Match, Supabase, sibling inventory.

---

## 11. Deliverable persistence (after approval)

Write [`docs/teevo-match/validation/PHASE_2E_QUALITY_AUDIT.md`](docs/teevo-match/validation/PHASE_2E_QUALITY_AUDIT.md) from this plan (no code changes in that step unless P0/P1 implementation is separately approved).
