# Teevo Match — Phase 2C Internal Product Validation Report

**Date:** 18 October 2026  
**Baseline commit:** `1d4636beca85256c3ed3877c5a3d54bcf31fe837`  
**Environment:** Staging (`https://test.teevohq.com`) + local execution of the same commit against staging Supabase (read-only)  
**Public Match / `match_enabled`:** Disabled (unchanged)  
**Migrations applied this phase:** None  
**Commits made this phase:** None (report only)  
**Fixtures written:** None (existing staging Driver used)

---

## Verdict

### **CONDITIONAL GO** for planning a controlled golfer beta

Engine, differentiation, disclaimers, inventory attach/exclusion logic, and regression suites meet the acceptance bar for **planning**.  

**Blocked for beta kickoff until founder completes the remaining live-session checks** (admin UI walkthrough + non-admin API 403) and **one independent fitter review** is recorded (Decision 1).

No unresolved **P0** defects were found in covered checks. Open gaps are **coverage**, not known product defects.

---

## 1. Staging deployment readiness

| Check | Result |
|---|---|
| `origin/staging` tip | `1d4636beca85256c3ed3877c5a3d54bcf31fe837` |
| `https://test.teevohq.com/api/health` | `200` — Supabase URL/anon/service keys present; listings OK |
| Yellow **TEST ENVIRONMENT** badge | Observed on home (mobile viewport) |
| Unauthenticated `/admin/match` | `307` → `/login?redirect=/admin` |
| Public `/match` | `404` (no public Match route) |
| Marketplace home | Loads; listings visible including staging Driver |

**Deployment:** Staging already serving this commit tip. **No redeploy requested or performed.**

---

## 2. Live HTTP authorisation

| Case | Result |
|---|---|
| Unauthenticated `POST /api/admin/match/recommend` | **`401`** `{"error":"Unauthorized"}` |
| Invalid session cookie | **`401`** |
| Non-admin authenticated session | **Not executed** — no non-admin staging credentials available to this agent |
| Admin authenticated session `200` | **Not executed** — no admin login session available to this agent |

Route contract (source): `requireAdmin()` runs before `runCatalogueRecommendation`; response stamps `public_match_enabled: false`.

**Follow-up (founder):** With admin and non-admin browser sessions, repeat POST recommend and record status codes in an addendum.

---

## 3. Five contrasting golfer journeys

Executed via **production pathway** `runCatalogueRecommendation` at commit `1d4636b` (same code as staging). Inventory empty for catalogue-only quality review.

### J1 — High-handicap rightward miss  
**Mode:** `NAMED_HEADS`  
| Rank | Head | Year | Fit | Band | Conf | Active dims |
|---|---|---|---|---|---|---|
| 1 | Adams XTD | 2014 | 94.5 | EXCELLENT | HIGH | 5 |
| 2 | Yonex EZONE GT Type D | 2024 | 94.1 | EXCELLENT | HIGH | 5 |
| 3 | Bridgestone BX2HT | 2025 | 94.0 | EXCELLENT | HIGH | 5 |

Plausible draw/forgiveness territory. **Note (P1-候補):** #1 is an older generation despite near-identical Fit to newer heads — expected without Fit recency; presentation tie-break only applies on **exact** Fit ties.

### J2 — Low-handicap control  
**Mode:** `NAMED_HEADS`  
| Rank | Head | Year | Fit | Band | Conf |
|---|---|---|---|---|---|
| 1 | TaylorMade Qi4D | 2026 | 100 | EXCELLENT | HIGH |
| 2 | Bridgestone BX1ST | 2025 | 100 | EXCELLENT | HIGH |
| 3 | Tour Edge Exotics C725 | 2025 | 100 | EXCELLENT | HIGH |

Materially different from J1 (players/control set). Exact Fit ties ordered by newer year.

### J3 — Seek forgiveness  
**Mode:** `NAMED_HEADS` (allowed under documented differentiation — not auto-suppressed for unresolved direction)  
| Rank | Head | Year | Fit | Active dims |
|---|---|---|---|---|
| 1 | Tour Edge Exotics Max | 2026 | 100 | 3 |
| 2 | TaylorMade SIM Max | 2020 | 100 | 4 |
| 3 | PowerBilt AF1 DFX High MOI | 2014 | 100 | 4 |

Consistent with Decision 3. Uncertainty copy should stress incomplete dims (explanations include loft/shaft + model-level disclaimers).

### J4 — High speed / lower flight  
**Mode:** `NAMED_HEADS`  
| Rank | Head | Year | Fit | Conf |
|---|---|---|---|---|
| 1 | Cobra King LTD Pro | 2016 | 94.4 | HIGH |
| 2 | Bridgestone BX1 LS | 2025 | 94.1 | HIGH |
| 3 | Cobra DARKSPEED LS | 2024 | 91.7 | HIGH |

Materially different (LS / lower-flight lean). Older #1 again reflects exact Fit ordering without Fit recency.

### J5 — Incomplete swing info  
**Mode:** `CHARACTERISTIC_GUIDANCE`  
**Audit reason:** `NO_MEANINGFUL_HEAD_DIFFERENTIATION`  
No named heads — correct vs sparse / crowded top-Fit partial coverage.

### Cross-journey

| Check | Result |
|---|---|
| Material differentiation J1 vs J2 vs J4 | **Pass** — distinct head sets |
| Determinism (J1×2) | **Pass** — identical keys |
| Catalogue presented as purchase offer | **Pass** — summaries state not a purchase offer; loft/shaft not scored |
| Understandable / qualified (≥4/5) | **Pass** — J1–J4 named + qualified; J5 guidance |

**Founder judgment (interim):** No **clearly unsuitable** #1 identified for detailed profiles J1–J4 pending independent fitter review. Older #1s are a known presentation trade-off, not a Phase 1 scoring defect.

---

## 4. Mobile UX

| Check | Result |
|---|---|
| 390×844 home | **TEST ENVIRONMENT** badge; hamburger nav; marketplace usable |
| Unauth `/admin/match` on mobile | Redirects to login; form usable |
| Full questionnaire + results on mobile as admin | **Not executed** (login required) |

---

## 5. Inventory attachment (staging)

### Live stock snapshot (read-only)

- Public Driver rows (pending/verified, not archived): **1**
- Purchasable (`isListingPurchasable`): **1**
- Unique head resolution: **`ping|g400-max|2018`**, handedness **RIGHT**, shaft **UNRESOLVED**, ~£150

### Successful real attachment (Decision 2)

Against the live staging listing (ID prefix `48d4afa0…`):

| Check | Result |
|---|---|
| Attach when recommended key matches | **Pass** — 1 item |
| Mode | `HEAD_ONLY` |
| Unverified shaft label path | **Pass** (`unverified_shaft: true`) |
| Full listing Match badge | **Absent** (correct — shaft unresolved) |

### Exclusion proofs (live listing mutated in-memory only; no DB writes)

| Case | Attached count |
|---|---|
| Wrong handedness | **0** |
| Unavailable | **0** |
| Ambiguous head | **0** |

Synthetic unit proofs also covered in `match.phase2b.test.ts` (archived/paused/pending/sold → UNAVAILABLE).

**Fixtures:** Not required — existing staging Driver sufficient for Decision 2. No production inventory touched.

---

## 6. Regression

| Suite | Result |
|---|---|
| `match.phase2a` (19) + `match.phase2b` (10) + phase1 (9) + verification (12) | **50/50 passed** |
| Full harness 48 archetypes + 168 probes | **PASS**, `failures: []` |

Frozen intelligence / golden fixtures: **unchanged**.

---

## 7. Issues

### P0 — none open in covered scope

### P1 — document; accept or fix before beta

| ID | Issue | Severity | Recommendation |
|---|---|---|---|
| P1-1 | Older heads can rank #1 when Fit is slightly higher (J1 Adams 2014; J4 Cobra LTD 2016) | P1 | Accept for beta with UI year visible, **or** product revisit of exact-tie-only recency (no Fit change) |
| P1-2 | J3 named heads with only 3–4 active dims and Fit 100 | P1 | Accept under Decision 3; ensure UI uncertainty is prominent (already in explanations) |
| P1-3 | Staging Driver liquidity = 1; journey-native attach rare | P1 | Optional staging fixtures later (brand/model matching popular heads); **not required** for this report |
| P1-4 | Live admin UI + non-admin HTTP not completed by agent | Coverage | Founder addendum before beta |

### Not defects

- Catalogue Fit omits loft/shaft (by design).  
- Head-only attach without full badge when shaft unresolved (by design).  
- Public Match disabled (by design).

---

## 8. Evidence index (redacted)

Stored under this folder / agent run artifacts:

- Staging health `200`; unauth recommend `401`; public `/match` `404`
- Mobile screenshot of staging home with **TEST ENVIRONMENT** badge (local screenshot path only; no cookies)
- Journey JSON (ephemeral run; key results transcribed above)
- Live attach proof JSON (listing ID **prefix only**)

**Not stored:** session cookies, passwords, full listing UUIDs beyond prefix, seller emails/PII.

---

## 9. Remaining founder checklist (before beta planning → kickoff)

1. Login as **admin** on staging → complete questionnaire J1 + J5 in UI → confirm results + audit panel.  
2. Login as **non-admin** → `POST /api/admin/match/recommend` → expect **403**.  
3. Mobile: full questionnaire + results as admin.  
4. Independent fitter review of J1–J4 top recommendations (Decision 1).  
5. Explicit accept/fix of P1-1 and P1-2.

---

## 10. Decision for controlled golfer beta planning

| Question | Answer |
|---|---|
| Continue designing beta protocols? | **Yes — CONDITIONAL GO** |
| Invite external golfers now? | **No** — complete founder + fitter checklist first |
| Enable public Match / apply `match_enabled`? | **No** — separate approval required |
| Deploy / commit / migrate? | **No** — none performed; none recommended in this step |

---

*End of Phase 2C internal validation report.*
