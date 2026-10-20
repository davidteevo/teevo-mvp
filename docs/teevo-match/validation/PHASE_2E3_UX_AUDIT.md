# Phase 2E.3 — Final Refinement UX & Interaction Audit

**Date:** 2026-10-19  
**Surface:** Local admin Match preview (`http://localhost:3000/admin/match`) with Phase 2E.3 UI  
**Viewport:** Mobile ~390×844 primary; ~375×812 secondary; desktop chrome observed  
**Public Match:** Remains disabled (`/match` → 404)  
**Scope:** Audit only — no production redesign or logic changes in this phase

Screenshots: [`phase2e3-ux-screenshots/`](./phase2e3-ux-screenshots/)

---

## Executive verdict

Conditional refinement is **usable and largely aligned** with Teevo principles on admin preview: Pathway A stays quiet on named results; Pathway B asks ball-flight questions with SKIP/KEEP/UNKNOWN; Pathway C is approachable for beginners; loading and skip behave correctly; STRAIGHT / VARIABLE / DISTANCE / FORGIVENESS are respected on successful paths.

**Phase 2F is not ready without addressing at least the P1 items below.** No claim of 24/24 profile coverage — this audit exercised the five previously blocked recovery profiles plus one ordinary named control through the live UI.

---

## 1. Journey evaluations

### A. Ordinary named (`beginner_forgiveness`)

| Check | Result |
|---|---|
| Refinement offered? | **No** |
| Named cards | Cleveland Launcher XL Lite Draw, Wilson Launch Pad 2, Cleveland Launcher HB Turbo Draw |
| Regressions | None observed; inventory empty-state copy present |

Screenshot: `A-beginner-named-no-refine-390.png`

**UX:** Clear named results, familiar Teevo cards, no unnecessary questions. Pass.

---

### B. Mid-handicap distance (`mid_handicap_distance`)

| Step | Observation |
|---|---|
| Start | `CHARACTERISTIC_GUIDANCE` (~61-way tie) |
| Question | Start direction (STRAIGHT preserved in copy) |
| Answer | Starts right |
| Loading | “Updating…”; Continue/Skip disabled |
| End | `NAMED_HEADS`, 5 active dims; curve still **STRAIGHT**; objective still **DISTANCE** |

Screenshot: `B-mid-refinement-question-390.png`, `B-mid-named-recovered-390.png`, `B-mid-refinement-375.png`

**UX:** Strong. Goal and next action clear; touch targets ≥48px; no horizontal overflow at 390. Soft-shortlist names (Vice VGD01+, 915D3, 913D2) differ from some 2E.2 matrix examples but remain UK-eligible 5-dim named recovery.

---

### C. Inconsistent strike / two-way miss (`inconsistent_strike`)

| Path | Observation |
|---|---|
| Q1 | VARIABLE clarify — “Still miss both ways” available |
| KEEP → Q2 | Trajectory; VARIABLE **retained**; no re-ask of miss pattern |
| UNKNOWN traj (step 2) | Refinement ends; guidance preserved |
| Informative: curves right | **NAMED** after **1** step — incomplete coverage (3–4 dims); XXIO / Cleveland draw |

Screenshots: `C-inconsistent-variable-clarify-390.png`, `C-inconsistent-after-keep-traj-390.png`, `C-inconsistent-exhausted-unknown-390.png`, `C-inconsistent-named-curve-right-only-390.png`

**UX:** Does not pressure golfers to invent a consistent miss. Incomplete-coverage banners fire correctly.  
**Product gap:** Answering “more often curves right” names immediately and **closes** refinement, so the golfer cannot give trajectory for the 5-dim path preferred in 2E.2.

---

### D. Two-question recovery (`sparse_incomplete`)

| Step | Observation |
|---|---|
| Q1 | Typical ball flight → Mid |
| Q2 | Typical curve → Curves right |
| Progress | Clear sequential questions; prior Mid retained in answers |
| Max steps | Two UI clarifications then named |
| End | `NAMED_HEADS`, **5 dims** — Titleist 913D2, Cobra Aerojet, PXG 0211 |

Screenshots: `D-sparse-incomplete-traj-q1-390.png`, `D-sparse-incomplete-named-recovered-390.png`

**UX:** Pass for informative recovery. Matches diagnostic engine shortlist.  
**Note:** Refine session `stepCount` / `askedQuestionIds` under-counted the traj step in storage after Q1 (see P1).

---

### E. Minimum fitting intake (`sparse_handedness_only`)

| Check | Result |
|---|---|
| Screen | “A few basics before we can name drivers” |
| Optional hcp/speed | Present; blank allowed |
| UNKNOWN-only submit | Stays guidance; intake remains |
| Informative (18 / 90 / Mid / Curves right) | `NAMED_HEADS`, 5 dims (913D2 / Aerojet / 0211) |

Screenshots: `E-handedness-min-intake-390.png`, `E-handedness-named-after-intake-390.png`

**UX:** Approachable beginner copy; labels and placeholders clear. No primary-objective field on intake (acceptable here because curve alone recovered).

---

### F. Failure and recovery states

| State | Result |
|---|---|
| Skip refinement | Panel dismissed; last guidance kept |
| Revise answers | Link to questionnaire present |
| Refresh/remount | Results reload from sessionStorage after hard reload |
| API error (mocked 500) | Alert: failure + “Previous results are unchanged.” Mode stays guidance |
| Double submit | Continue disabled while “Updating…” |
| Exhausted allowance | After 2 steps / skip, panel gone |
| Back navigation | Not fully exercised beyond remount; revise link works |

Screenshot: `F-api-error-preserve-390.png`

**Defect:** On API failure, answers + refine step are already mutated before the failed request; optional STRAIGHT follow-up can appear while results stay stale (see P1).

---

## 2. Product integrity

| Rule | Verified? |
|---|---|
| Refinement only when guidance / insufficient evidence | Yes (Pathway A silent on named) |
| STRAIGHT / VARIABLE / UNKNOWN respected | Yes on successful and KEEP/UNKNOWN paths |
| DISTANCE / FORGIVENESS not silently replaced | Yes on mid & inconsistent recoveries |
| Updated answers submitted to existing engine | Yes via `/api/admin/match/recommend` |
| Named from new response (not stale) | Yes when API succeeds |
| UK / Fit / B2.1 / overlay versions unchanged | Version stamps unchanged (`MATCH_UK_HEAD_RELEVANCE_V1`, etc.) |
| Public Match disabled | `/match` 404; admin recommend independent of public flag |

---

## 3. Actual UI recovery vs 2E.2 diagnostics

| Profile | Start mode | Question(s) | Answers | Steps | Final | Active dims | Credible? | vs diagnostic |
|---|---|---|---|---|---|---|---|---|
| `mid_handicap_distance` | Guidance | Start direction | RIGHT | 1 | Named | 5 | Yes | Same family of recovery; soft-shortlist names differ (Vice/915/913 vs matrix draw stack examples) |
| `inconsistent_strike` | Guidance | VARIABLE clarify | RIGHT | 1 | Named | 3–4 | Weak | Diagnostic best was MID+RIGHT → 5 dims; UI stops after weak name |
| `inconsistent_strike` (KEEP+UNKNOWN) | Guidance | Clarify → traj | KEEP, UNKNOWN | 2 | Guidance | 3 | Expected | Matches “not sure does not recover” |
| `sparse_incomplete` | Guidance | Traj → curve | MID, RIGHT | 2 | Named | 5 | Yes | Matches 913D2 / Aerojet / 0211 |
| `sparse_handedness_only` | Guidance | Pathway C intake | 18, 90, MID, RIGHT | 1 intake | Named | 5 | Yes | Diagnostic used FORGIVENESS; UI named with objective UNKNOWN |
| `beginner_forgiveness` | Named | — | — | 0 | Named | 5 | Control | N/A |

**24/24 not claimed** — only these journeys were run through the live UI.

---

## 4. Defects and severity

### P0 — none observed

Blocking launch of public Match is out of scope; nothing P0 for admin-preview continuation of 2E.3 itself.

### P1

1. **Weak named recovery ends refinement** (`inconsistent_strike` + directional curve). Golfer cannot supply the second clarifying answer that yields 5-dim quality. Prefer continuing Pathway B while incomplete-coverage / low dims, or deprioritising weak names until traj is known.
2. **API failure mutates answers and refine step before confirm.** Results stay old, but start/curve may already change; refine panel advances or changes; “Previous results unchanged” is only half-true. Should roll back answers/refine on failed recommend, or only persist after success.
3. **Refine session step accounting race** (`sparse_incomplete`). After Q1, `stepCount` / `askedQuestionIds` in sessionStorage can reset while answers already updated (offer-effect overwrite). Risks incorrect max-step enforcement under remount. Fix offer logging to merge with latest refine state (functional update / no stale overwrite).

### P2

1. **Duplicate subtitle** on optional STRAIGHT question: headline and body both say “One more detail could help us narrow them down.”
2. **Error string glue:** `"{error} Previous results…"` needs a sentence break.
3. **Admin chrome on mobile:** Sidebar / ops nav competes with Match content; acceptable for admin preview, not for a future public surface.
4. **Selection affordance** on RadioCards is subtle (border only); works but could be clearer for mobile.
5. **Cold results flash:** Session inject / first client paint can briefly show “No results” until remount (automation-sensitive; questionnaire `setItem` then `router.push` may be fine for real users — spot-check after questionnaire submit).

---

## 5. Recommended minimal changes (for product approval — not implemented here)

1. On recommend failure: revert answers + refine meta to pre-submit snapshot; keep error alert.
2. Keep Pathway B open when `NAMED_HEADS` has `active_catalogue_dim_count < 5` (or only close after informative traj when launch was unresolved) — smallest policy/UI tweak for inconsistent_strike quality.
3. Offer-effect: `setRefine(prev => …)` / read latest storage so stepCount cannot regress.
4. Copy: remove duplicate subtitle when headline already matches; punctuate error message.

Do **not** add three-choice categories, Best Value, Fit/UK changes, or public Match activation in this fix set.

---

## 6. Phase 2F readiness

| Criterion | Status |
|---|---|
| Core refinement UX (A/B/C) | Acceptable for admin preview |
| Integrity protections | Mostly solid; API-failure path needs fix |
| Credible recovery for blocked profiles | 4/5 strong; inconsistent weak-name path needs product decision |
| Public / 2F feature work | **Hold** |

**Recommendation:** Approve Phase 2E.3 UX in principle after **P1 fixes** (or explicit product acceptance of weak early naming). **Do not start Phase 2F** until those P1 items are resolved or waived in writing.

---

## 7. Screenshot index

| File | State |
|---|---|
| `A-beginner-named-no-refine-390.png` | Named, no refine |
| `B-mid-initial-guidance-390.png` | Mid guidance top |
| `B-mid-refinement-question-390.png` | Start-direction question |
| `B-mid-named-recovered-390.png` | Mid recovered named |
| `B-mid-refinement-375.png` | Mid refine @ 375 |
| `C-inconsistent-variable-clarify-390.png` | VARIABLE clarify |
| `C-inconsistent-after-keep-traj-390.png` | After KEEP → traj |
| `C-inconsistent-exhausted-unknown-390.png` | Exhausted / UNKNOWN |
| `C-inconsistent-named-curve-right-only-390.png` | Weak named (3/5) |
| `D-sparse-incomplete-traj-q1-390.png` | Sparse Q1 traj |
| `D-sparse-incomplete-named-recovered-390.png` | Sparse 5-dim named |
| `E-handedness-min-intake-390.png` | Pathway C intake |
| `E-handedness-named-after-intake-390.png` | Intake recovered named |
| `F-api-error-preserve-390.png` | API error + follow-up Q |

---

*End of audit. Awaiting product approval before any implementation.*
