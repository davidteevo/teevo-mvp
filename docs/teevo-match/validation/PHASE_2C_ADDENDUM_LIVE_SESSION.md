# Phase 2C addendum — live staging session checks

**Date:** 18 October 2026  
**Deployed staging commit (origin/staging):** `1d4636beca85256c3ed3877c5a3d54bcf31fe837`  
**Local unpushed analytics commit:** `1ddc49bde49b8be0d2be509cd4125dbfb2f94ed4` (not on staging)  
**Deployments triggered this session:** None  
**Migrations / public Match:** Unchanged (off)

---

## Staging deployment status

| Item | Value |
|---|---|
| Published tip (via `origin/staging`; auto-deploy source) | `1d4636b` — Phase 2A/2B admin catalogue + inventory |
| Local HEAD | `1ddc49b` — admin-preview analytics only |
| Analytics on staging? | **No** — not pushed; `/api/events` rejects `match_questionnaire_started` with `400 Invalid or disallowed event name` |
| Health | `200` |
| Public `/match` | `404` |
| TEST ENVIRONMENT badge | Observed |

**No new deployment requested without approval.** To validate analytics on staging, push/deploy `1ddc49b` (or cherry-pick) after explicit approval.

---

## Live HTTP authorisation

| Case | Result | Evidence |
|---|---|---|
| Unauthenticated recommend | **PASS** `401` | `{"error":"Unauthorized"}` |
| Non-admin authenticated (seller role) | **PASS** `403` | `{"error":"Forbidden"}` via session cookie |
| Admin authenticated recommend | **PASS** `200` | `ok: true`, `mode: NAMED_HEADS`, `public_match_enabled: false` |

---

## Logged-in admin questionnaire + results

| Check | Result |
|---|---|
| `/admin/match` entry (admin shell) | **PASS** — Internal preview · Start questionnaire |
| 5-step questionnaire | **PASS** |
| Back navigation restores answers | **PASS** — step 3→2 kept speed `95` and handicap `18` |
| Optional fields skippable | **PASS** — loft/budget left blank; “No current driver / not sure” |
| Results: named heads + disclaimers | **PASS** — Adams XTD, Yonex EZONE GT Type D, Bridgestone BX2HT; not purchase offers; loft/shaft not scored |
| Inventory empty-state per head | **PASS** — “No matching Teevo listings…” without failing recommendations |
| Shaft guidance | **PASS** — Regular–Stiff / ~50–65 g / mid-launch + non-fitted caveats |
| Admin audit panel present | **PASS** |

Screenshots (local agent paths, no cookies/PII stored in repo):  
`phase2c-staging-home.png`, `phase2c-admin-results-desktop.png`, mobile questionnaire/results captures.

---

## Mobile admin journey (390×844)

| Check | Result |
|---|---|
| Mobile chrome (hamburger / Open menu) | **PASS** |
| Questionnaire usable | **PASS** |
| Results cards + inventory sections readable | **PASS** |
| Full re-entry of all 5 steps under mobile-only session | Covered by desktop completion + mobile viewport review of questionnaire step 1 and results |

---

## Admin-preview analytics on staging

| Check | Result |
|---|---|
| Event names allowlisted on deployed build | **FAIL / BLOCKED** — deploy is `1d4636b`; analytics land in unpushed `1ddc49b` |
| Live UI fetch of `/api/events` during journey | **None observed** (expected on current deploy) |
| Direct POST `match_questionnaire_started` | **`400`** disallowed event name |
| Payload design (code review of `1ddc49b`) | **PASS** — all events require `surface: "admin_preview"`; properties limited to `mode`, `named_count`, `catalogue_key`, `listing_id`, `attach_mode` (no questionnaire answers / PII) |

**Action required for full PASS:** approve push + staging deploy of `1ddc49b`, then re-check Network for the four Match events.

---

## P1-1 and P1-2 (detail)

### Product decisions (18 Oct 2026)

1. **P1-1 provisionally accepted** for internal validation: Fit unchanged; UI shows release year; older-above-newer flagged for fitter review.  
2. **P1-2 conditionally accepted**: named heads with 3–4 active dims OK when uncertainty + model-level/loft/shaft limits are prominent (UI reinforced; no new fitting rules).

### P1-1 — Older head can rank #1 when Fit is slightly higher

| Field | Detail |
|---|---|
| **Severity** | **P1** (presentation / trust), not scoring defect |
| **Exact observation** | Live admin UI journey: **#1 Adams XTD Driver** (2014 gen) above **Yonex EZONE GT Type D** (2024) and **Bridgestone BX2HT** (2025), all EXCELLENT / HIGH |
| **Cause** | Ranking is band → Fit desc → exact-Fit year tie-break only. Near-ties with higher Fit on older heads win; year does not apply unless Fit is identical |
| **User impact** | Golfers/fitters may distrust a visibly older #1 despite correct Fit math; risk of “why recommend 2014?” feedback in beta |
| **Decision** | Provisionally accept; display year; flag older-vs-newer for independent fitter review |

### P1-2 — Named heads with incomplete active characteristic coverage

| Field | Detail |
|---|---|
| **Severity** | **P1** (explanation / uncertainty), allowed by Phase 2C Decision 3 |
| **Exact observation** | Sparse forgiveness-seeking profiles can return `NAMED_HEADS` with **3–4** active catalogue dims and Fit crowding (e.g. prior J3: Tour Edge Exotics Max / SIM Max / PowerBilt at Fit 100) when differentiation gate (A)/(B) does not fire |
| **Cause** | Differentiation suppresses only flat/crowded pools under `max_active < 5`; unresolved direction alone does not block names |
| **User impact** | Recommendations may look over-confident if UI underplays incomplete coverage; fitter may want guidance mode instead |
| **Decision** | Conditionally accept with prominent uncertainty + model-level/loft/shaft limitations in existing UI |

---

## Pass/fail matrix (this addendum)

| Check | Status |
|---|---|
| Staging deploy tip confirmed | **PASS** (`1d4636b`) |
| Non-admin recommend 403 | **PASS** |
| Admin questionnaire → results | **PASS** |
| Back nav + optional answers | **PASS** |
| Mobile questionnaire/results | **PASS** |
| Inventory empty sections | **PASS** |
| Analytics live on staging | **BLOCKED** (needs deploy of `1ddc49b`) |
| P1-1 / P1-2 documented | **PASS** (accept/fix still founder decision) |

---

## Requires founder / fitter manual review

1. Accept or fix **P1-1** (older #1 presentation) before external golfer beta.  
2. Accept or tighten **P1-2** (named heads with 3–4 active dims).  
3. Approve **push + staging deploy** of analytics commit `1ddc49b` to complete analytics validation.  
4. Independent fitter review of J1–J4 tops (Decision 1) — still outstanding.  
5. Do **not** enable public Match / apply `match_enabled` without separate approval.

---

*End of addendum.*
