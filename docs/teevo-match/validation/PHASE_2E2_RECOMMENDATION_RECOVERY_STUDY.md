# Phase 2E.2 — Five-Profile Recommendation Recovery Study

**Status:** Diagnostic study complete. **Do not implement** adaptive clarification or equivalent-options mode until product review.

**Engine:** Production `runCatalogueRecommendation` with UK gate on (same path as admin Match).  
**Matrix artefact:** [`phase2e2-recovery-matrix.json`](./phase2e2-recovery-matrix.json)  
**Runner (test-only):** [`scripts/phase2e2-recovery-study.ts`](../../../scripts/phase2e2-recovery-study.ts)

Counterfactual answers are **testing scenarios**, not claims about what a golfer would say.

---

## Executive answers

| Question | Finding |
|---|---|
| Can we reach 24/24 named recommendations using additional legitimate golfer information? | **Only if golfers can supply informative (non-UNKNOWN) answers.** Four of five guidance profiles can recover with existing fields; handedness-only needs a **minimum intake**, not one clarification. “Not sure” answers do **not** recover. |
| How many additional questions? | **One** for the two mid-handicap “rich but neutral” profiles (when answered informatively). **One–two** for inconsistent strike / sparse incomplete (two preferred for full five-dim coverage). **Multi-field minimum intake** for handedness-only. |
| Which exact questions? | Prefer **typical curve** or **miss-reduction objective**; then **typical trajectory** when launch is unresolved. Order below. |
| What remains unresolved? | UNKNOWN answers; VARIABLE two-way miss blocking direction; large equal-Fit 5-dim ties (B2.1 allows naming but shortlist is soft-selected); incomplete-dim named recoveries under sparse/inconsistent cases. |
| What to implement next? | Smallest viable: **conditional refinement** that re-asks existing curve / miss-reduction when named ranking is blocked by crowded incomplete differentiation and direction is neutral/unresolved — **after** product approval. |

---

## Recovery table

| Profile | Original blocker | Best next question | One-question outcome | Two-question outcome | Recommended UX |
|---|---|---|---|---|---|
| `sparse_handedness_only` | `INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS` (0 evidence-backed dims) | Not one question — **minimum intake** (handicap + speed + trajectory + directional objective/curve) | Single fields fail or move to crowded 3-dim B2.1 guidance | N/A as two-Q alone; **3–5 field intake** with direction → named (defensible 5-dim UK stacks) | Minimum fitting-information gate before ranking; keep guidance until intake met |
| `sparse_incomplete` | B2.1: 217 top-tied @ 3 dims | `typical_trajectory` then `typical_curvature` (pair) | Direction alone cuts ties but stays guidance (min dims 4). `HIGHER_FLIGHT` alone → named **but weak** (3–4 dims, MEDIUM, Exotics Max) | `MID` traj + `RIGHT` curve → named, 5 dims, UK-eligible draw assist | Ask speed if missing, then curve **or** traj; avoid treating HIGHER_FLIGHT-only as success |
| `inconsistent_strike` | B2.1: 125 top-tied @ 3 dims; direction UNRESOLVED (`TWO_WAY_MISS` from VARIABLE start/curve) | `typical_trajectory` (informative) or `typical_curvature` (non-VARIABLE) | Several one-Q answers name, often **incomplete** (3–4 dims). UNKNOWN / STRAIGHT stay guidance. `REDUCE_RIGHT_MISS` alone fails while VARIABLE start/curve remain | `MID` traj + `RIGHT` curve → named, **5 dims**, coherent draw/forgiveness UK stack | Clarify flight **or** curve first; prefer two-step if first answer leaves &lt;5 dims |
| `mid_handicap_distance` | B2.1: 61 top-tied, min active 4 (all 5 req dims already evidence-backed; direction **NEUTRAL**) | `typical_curvature` (LEFT or RIGHT) or miss-reduction objective | Strong recovery across curve / start / miss-reduction / non-MID traj / CONTROL / FORGIVENESS. `UNKNOWN` curve and heel-only **fail** | Not required when one informative direction answer is given; two-Q also recovers | Conditional: “What’s your typical curve?” or “Main miss to reduce?” |
| `mid_handicap_carry_hint` | Same pattern as distance (tied 80, min 4). Carry is **not** a catalogue head Fit dim | Same as distance | Same family of recoveries; carry alone changes little. `consistency_low` alone **fails** here (unlike distance) | Same as distance | Same refinement; do **not** invent carry-based head Fit |

---

## Baseline diagnoses (checkpoint D)

| Profile | Inputs (abbrev) | Evidence-backed dims | Mode / reason | Top-tied families | Min/max active dims | Weak / missing fields |
|---|---|---|---|---|---|---|
| `sparse_handedness_only` | RIGHT only | 0 | Insufficient evidence-backed dims | 0 | 0/0 | Nearly all questionnaire fields |
| `sparse_incomplete` | hcp 14, DISTANCE, all flight/strike UNKNOWN, no speed | 2 | B2.1 crowded @ 3 dims | 217 | 3/3 | Speed, trajectory, start, curve, strike |
| `inconsistent_strike` | 21hcp 82mph FORGIVENESS; traj UNKNOWN; start/curve **VARIABLE**; strike VARIABLE | 3 | B2.1 crowded @ 3 dims | 125 | 3/3 | Trajectory; non-variable start/curve (TWO_WAY_MISS) |
| `mid_handicap_distance` | 14hcp 95mph MID/CENTRE/STRAIGHT DISTANCE | **5** | B2.1 crowded incomplete top tier | 61 | 4/5 | Non-neutral direction / stronger flight intent (answers exist but are neutral) |
| `mid_handicap_carry_hint` | Same + carry 230 | **5** | B2.1 crowded incomplete top tier | 80 | 4/5 | Same; carry unused for catalogue head Fit |

Causes are **not** identical: two are evidence-starved; one is conflicted VARIABLE miss; two are information-rich but **directionally neutral**, so many UK heads share incomplete top Fit.

---

## Counterfactual matrix (engine outputs)

Full machine-readable results: [`phase2e2-recovery-matrix.json`](./phase2e2-recovery-matrix.json).

### Counts

| Metric | Value |
|---|---|
| Profiles recoverable after **one informative** answer (at least one tested answer → NAMED) | **4 / 5** (`sparse_incomplete`, `inconsistent_strike`, `mid_handicap_distance`, `mid_handicap_carry_hint`) |
| Profiles recoverable only after **two** answers for *high-quality* 5-dim named | Prefer 2 for `sparse_incomplete` and best path for `inconsistent_strike` |
| Profiles needing **minimum intake** | **1** (`sparse_handedness_only`) |
| Recoveries that fail when answer is UNKNOWN / no-op | Curve UNKNOWN, traj UNKNOWN, heel-only on mid profiles, etc. |
| UK-ineligible named recoveries in matrix | **0** |

### `sparse_handedness_only`

| Scenario | Mode | Tied / min dims | Named keys (if any) | Notes |
|---|---|---|---|---|
| speed only | Insufficient evidence | — | — | |
| handicap only | Guidance B2.1 | 70 / 3 | — | Moves past evidence gate |
| objective FORGIVENESS | Guidance B2.1 | 87 / 3 | — | |
| traj MID / curve RIGHT alone | Insufficient evidence | — | — | |
| hcp+speed+DISTANCE | Guidance B2.1 | 238 / 3 | — | |
| hcp+speed+MID+DISTANCE | Guidance B2.1 | 65 / 3 | — | Launch MID still no direction |
| hcp+speed+MID+**REDUCE_RIGHT_MISS** | **NAMED** | 1 / 5 | 913D2, Aerojet, 0211 | Defensible draw assist |
| Credible slice intake (hcp+speed+MID+RIGHT curve+FORGIVENESS) | **NAMED** | 1 / 5 | 913D2, Adams XTD, DYNAPWR Ti | Defensible |

**Conclusion:** Treat as minimum intake, not clarification.

### `sparse_incomplete`

| Scenario | Mode | Tied / min | Named (abbrev) | Defensible? |
|---|---|---|---|---|
| speed / traj HIGH / curve RIGHT / start RIGHT / REDUCE_RIGHT alone | Guidance | ties cut, min often 4 | — | Direction without launch leaves incomplete top tier |
| **HIGHER_FLIGHT** alone | NAMED | 1 / 3 | Exotics Max (3d MEDIUM), Benross, XXIO X | **Weak** — incomplete coverage |
| traj MID + curve RIGHT | **NAMED** | 1 / **5** | 913D2, Aerojet, 0211 (MEDIUM conf) | Acceptable UK draw stack; MEDIUM from sparse golfer evidence |
| UNKNOWN traj/curve | Guidance | 217 / 3 | — | No recovery |

### `inconsistent_strike`

| Scenario | Mode | Tied / min | Named (abbrev) | Defensible? |
|---|---|---|---|---|
| traj HIGH | NAMED | 2 / 4 | Rogue ST Max LS, SIM Max, XXIO 14+ | Partial — 4 dims |
| traj MID | NAMED | 2 / 3 | SIM Max, Exotics Max, Covert | Weaker — Exotics Max UNKNOWN launch |
| traj LOW | Guidance | 31 / 4 | — | |
| curve RIGHT/LEFT | NAMED | 2 / 3 | XXIO pair + draw/fade peer | Thin coverage |
| curve STRAIGHT / traj UNKNOWN / strike HEEL | Guidance | | — | |
| REDUCE_RIGHT_MISS alone | Guidance | 69 / 3 | — | Direction still unresolved (`TWO_WAY_MISS`) while VARIABLE start/curve remain |
| **traj MID + curve RIGHT** | **NAMED** | 1 / **5** | Adams XTD, Qi35 Max, DYNAPWR Ti | **Best** — coherent forgiveness + draw |

### `mid_handicap_distance` / `mid_handicap_carry_hint`

Representative one-Q successes (both profiles unless noted):

| Answer | Typical result | Defensible? |
|---|---|---|
| curve RIGHT | Named 5-dim draw stack (913D2 / Aerojet / 0211) | Yes |
| curve LEFT | Named fade/players mix (JPX ONE SELECT, Vice, 915D3) | Yes (niche Vice known) |
| start LEFT/RIGHT | Named 5-dim | Yes |
| REDUCE_RIGHT / LEFT_MISS | Named 5-dim | Yes — strongest intent signal |
| FORGIVENESS | Named; may include Exotics Max @ 4 dims | Mixed |
| HIGHER_FLIGHT | Named 5-dim high-launch set | Yes |
| CONTROL | Named; carry_hint can leave **44-way** Fit-100 tie then soft shortlist | Technically gate-legal; **equivalent-head** presentation risk |
| traj HIGH / LOW | Named; may leave large 5-dim ties (11–67) | Gate-legal; soft shortlist ≠ unique Fit winner |
| curve UNKNOWN / strike HEEL only | Still guidance | — |
| consistency LOW | Named on distance; **still guidance** on carry_hint | Unreliable alone |

Carry distance does not unlock a new catalogue head dimension.

---

## Question effectiveness ranking

Recommended order when refining a blocked session:

1. **`typical_curvature`** (LEFT / RIGHT / STRAIGHT) — highest leverage for rich-neutral mid profiles; golfer-answerable; adds direction evidence. UNKNOWN fails (demonstrated).
2. **`primary_objective` miss-reduction** (`REDUCE_RIGHT_MISS` / `REDUCE_LEFT_MISS`) — equally strong when curve is unknown but miss intent is clear.
3. **`typical_start_direction`** — effective on mid profiles; weaker alone on inconsistent_strike while curve stays VARIABLE.
4. **`typical_trajectory`** (LOW / MID / HIGH) — critical when launch unresolved (sparse / inconsistent); MID-only on already-MID mid profiles is a no-op.
5. Strike pattern / consistency — usually insufficient alone for B2.1 recovery.
6. Speed — needed for sparse/handedness intakes; does not differentiate mid-neutral profiles by itself.

**Do not rank a question successful only because one favourable hypothetical names drivers.** Across plausible answers:

- Informative LEFT/RIGHT curve → recover mid profiles.
- UNKNOWN → no recover.
- HIGHER_FLIGHT-only on sparse → recover with **misleading** incompleteness.
- VARIABLE miss + REDUCE_RIGHT alone → no recover until start/curve stop conflicting.

Mobile friction: prefer **one** existing radio field (curve or miss-reduction) before a second.

---

## Equivalent-head / large-tie situations

Even after recovery, some answers produce **many** UK-eligible families tied at Fit 100 with **5 active dims** (B2.1 allows naming; soft shortlist picks three):

- Examples: `mid_handicap_carry_hint` + CONTROL (tied≈44); traj LOW/HIGH on mid profiles (tied≈46–67).

This reflects **genuine head-only equivalence** under current dimensions + soft shortlist policy — not missing golfer info alone.

A separately labelled **non-ranked equivalent-options** experience could be defensible for “many equally suitable models,” but is a **separate product decision**. This study does **not** implement or bypass B2.1.

---

## Fitting credibility of newly named results

| Class | Examples | Verdict |
|---|---|---|
| Strong | Mid + RIGHT curve / REDUCE_RIGHT → 913D2/Aerojet/0211 @ 5 dims HIGH | Credible |
| Strong | Inconsistent + traj MID + curve RIGHT → Adams XTD / Qi35 Max / DYNAPWR @ 5 dims | Credible |
| Acceptable | Sparse + traj+curve → same draw stack @ 5 dims MEDIUM confidence | OK with disclosure |
| Weak | Sparse + HIGHER_FLIGHT only; inconsistent traj MID with Exotics Max @ 3 dims | Do not treat as product success |
| Soft-shortlist risk | Large 5-dim ties (CONTROL / traj LOW) | Named is gate-legal; explain equal Fit; consider future equivalent-options |

---

## Evidence for / against adaptive clarification

**Supports a small conditional refinement flow**

- Demonstrated engine recoveries using **existing** fields only.
- Mid-handicap guidance is high product friction despite rich answers — one directional clarification often unlocks named UK recommendations.
- UNKNOWN paths correctly stay in guidance (no false confidence from empty answers).

**Against a broad chatbot / long questionnaire**

- Handedness-only needs a **minimum intake**, not chatty probing.
- Some one-Q recoveries are technically named but fitting-weak — adaptive UX must prefer quality (5-dim) paths.
- Large equal-Fit ties remain after “success” — clarification cannot invent Fit differences.

---

## Barriers to automatic 24/24 named

1. Golfers who answer UNKNOWN / refuse curve and miss intent.
2. VARIABLE two-way miss without resolving start/curve.
3. Handedness-only sessions without minimum intake.
4. B2.1 correctly blocking crowded incomplete tiers.
5. Head-only catalogue limits (no loft/shaft Fit; carry unused).
6. Even at 5 dims, many models can tie — naming three is presentation, not unique technical superiority.

---

## Product recommendation (smallest viable next)

**Recommend:** After approval, implement a **conditional refinement step** (not a new algorithm):

When mode is `CHARACTERISTIC_GUIDANCE` with reason `NO_MEANINGFUL_HEAD_DIFFERENTIATION`, and direction is NEUTRAL or UNRESOLVED, prompt with **existing** UI controls for:

1. Typical curve (preferred), or  
2. Miss-reduction objective if the golfer thinks in misses rather than curve.

Then re-run the same Match engine.

Also:

- **Minimum fitting-information gate** for handedness-only / near-empty sessions (handicap + speed + trajectory + one directional signal) before attempting named rankings.
- **Preserve characteristic guidance** when the golfer selects UNKNOWN.
- **Defer** non-ranked equivalent-options mode to a separate decision.
- **Do not** add AI chatbot, Fit weight changes, or carry-as-head-dim.

---

## Demonstrated vs proposed

| Demonstrated now | Proposed (needs approval) |
|---|---|
| Counterfactual matrix via live engine | Conditional refinement UX |
| Which answers recover which profiles | Minimum intake gate UX |
| Credibility flags on weak recoveries | Equivalent-options presentation mode |
| Diagnostic script + JSON matrix | Production questionnaire changes |

---

## Concise summary

- **24/24 named is not guaranteed** by engineering alone; it requires golfers to provide informative answers (or a minimum intake).
- **Four of five** guidance profiles can become named with **existing** questionnaire fields; **one** needs a multi-field minimum intake.
- **Ask next:** typical curve or miss-reduction; then trajectory when launch is unresolved.
- **Unresolved:** UNKNOWN answers, VARIABLE two-way miss, large equal-Fit shortlists, incomplete-dim “lucky” recoveries.
- **Implement next (when approved):** conditional refinement reusing curve / miss-reduction — not adaptive AI fitting, not B2.1 bypass.
