# Teevo Match — Local UX Visual Review (pre–P1 remediation)

**Date:** 2026-10-19  
**Surface:** Admin Match preview only — `http://localhost:3000/admin/match`  
**Public Match:** Remains disabled (`/match` → 404)  
**Code changes:** None (visual review only). Optional improvement prompt is a **static DOM mockup**, not production UI.

## How to review

1. Open [`index.html`](./index.html) in a browser for the full contact sheet.
2. Or open [`contact-sheet-390.png`](./contact-sheet-390.png) for a single-image overview of key 390px states.
3. Prior audit captures remain in [`../phase2e3-ux-screenshots/`](../phase2e3-ux-screenshots/).

## Profiles used (real engine responses via admin recommend)

| State | Profile / path |
|---|---|
| 1 Questionnaire | Live admin questionnaire step 1 |
| 2 Named | `beginner_forgiveness` → NAMED 5/5 |
| 3–4 Guidance + start Q | `mid_handicap_distance` → CHARACTERISTIC_GUIDANCE + start-direction refine |
| 5 VARIABLE clarify | `inconsistent_strike` → VARIABLE two-way miss question |
| 6 Two-question journey | `sparse_incomplete` → Mid traj → Curves right → NAMED 5/5 |
| 7 Min intake | `sparse_handedness_only` → Pathway C intake → 18/90/Mid/Curves right → NAMED 5/5 |
| 8 Recovered named | Mid after “Starts right” → Vice / 915D3 / 913D2 |
| 9 API failure | Mid refine with fetch mocked to 500 |
| 10 Weak named + mockup | `inconsistent_strike` + “More often curves right” → NAMED 3–4 dims; mockup overlay |

## Screenshot index

| File pattern | State |
|---|---|
| `01-questionnaire-initial-{375,390,1440}.png` | Initial questionnaire |
| `02-named-results-beginner-{375,390,1440}.png` | Normal named results |
| `03-guidance-with-refinement-mid-{375,390,1440}.png` | Guidance + conditional refinement chrome |
| `04-start-direction-question-mid-{375,390}.png` | Start-direction question (viewport) |
| `05-variable-two-way-miss-clarify-390.png` | VARIABLE / two-way miss clarify |
| `06-two-question-journey-*.png` | Q1 traj, Q2 curve, named recovery |
| `07-minimum-fitting-intake-*.png` | Pathway C intake (+ recovered) |
| `08-recovered-named-mid-*.png` | Successful mid recovery |
| `09-api-failure-preserve-*.png` | API failure messaging |
| `10-weak-named-*.png` | Weak named + **static mockup** optional prompt |

## Obvious UX concerns (review only — not fixed)

### Mobile layout

1. **Admin chrome dominates mobile.** On 375/390, the full Operations / Community / System nav list sits above Match content, so the first screenful is mostly admin sidebar. Fine for internal preview; unacceptable for any future public surface.
2. **Refinement panel is below the fold** on mobile until the user scrolls past disclaimers + admin chrome.
3. **Desktop emulation captures** sometimes clip content horizontally in the Glass browser harness; treat 1440 shots as directional, and prefer 390 for interaction review.
4. **Radio / option selection affordance** remains subtle (border/background only).

### Wording

1. **Dense disclaimer stack** before named cards (assessed-only + similar Fit + incomplete coverage + fitter review). Accurate, but heavy on small screens — first named club is far down.
2. **API error glue:** `"{error} Previous results are unchanged."` lacks a sentence break (visible in `09-*`).
3. **Duplicate / overlapping refine copy** still appears on some STRAIGHT follow-ups (“One more detail…” × headline/body).
4. **“Updating…”** disables Continue/Skip correctly (good).

### Interaction / integrity (visible in this review)

1. **Weak named ends refinement** (`10-*`): after VARIABLE → “curves right”, UI names XXIO/Cleveland at **3–4 of 5** dims and closes Pathway B — golfer cannot add trajectory for the preferred 5-dim path. Mockup on `10-*-mockup-*` shows the proposed optional “Add typical ball flight” prompt placement.
2. **API failure mutates refine path:** after mocked 500, UI still advances into a STRAIGHT-optional question while showing “Previous results are unchanged” — matches known P1 (answers/refine step advance before confirmed success).
3. **Pathway A stays quiet** on ordinary named (`02-*`) — no unnecessary refine (good).
4. **Informative recoveries work:** mid start-right; sparse two-step; handedness intake → 5-dim named (`06`, `07`, `08`).

## Guardrails confirmed

- No production Match UI/code shipped for the mockup.
- Public Match not enabled.
- Captures taken against local Next.js on port 3000 with authenticated admin session.
