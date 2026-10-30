# MATCH_OEM_DRIVER_CONFIGS_V1

Versioned OEM driver head–shaft offering reference for Teevo Fit Phase 3A Checkpoint B.

## Purpose

Record **verified manufacturer-offered** relationships between DRIVER_V1 catalogue heads and shaft options relevant to the UK/EU market, then reconcile those shafts to frozen SHAFT_V1 / SHAFT_IDENTITY_SUPPLEMENT_V1 identities.

This overlay is **not** a second equipment catalogue and is **not** a Cartesian compatibility matrix. It never invents loft × flex × handedness combinations the evidence does not establish.

Checkpoint B ships the reference layer and loader only. It does **not** wire named shaft options into the consumer Fit flow.

## Source of truth

| Artifact | Path |
|---|---|
| Overlay | `reference/oem-driver-configs.v1.json` |
| Loader | `lib/match/oem-driver-configs.ts` |
| Coverage report | `OEM_DRIVER_CONFIGS_COVERAGE_V1.md` |

Frozen `heads.json` / `shafts.json` / `shaft-identity-supplement.v1.json` are **not** modified by this overlay.

## Evidence states (do not collapse)

| State | Meaning | May name as Fit shaft option? |
|---|---|---|
| **Verified offering** (`VERIFIED_OFFERING`) | Manufacturer (or equivalent primary market listing) evidenced offering the identified shaft with the identified driver, within documented market and variant scope. | Only if shaft identity is also `RESOLVED_MATCH_ELIGIBLE` |
| **Incomplete offering evidence** (`INCOMPLETE_OFFERING_EVIDENCE`) | Relationship is plausible or partially supported, but not yet promotable. | No |
| **Unresolved shaft identity** (`UNRESOLVED`) | Shaft named in evidence cannot safely reconcile to a frozen identity. | No |
| **Aftermarket collision blocked** (`AFTERMARKET_COLLISION_BLOCKED`) | Similar aftermarket keys exist, but OEM tip / generation / build must not be merged into them. | No |
| **Recognition only** (`RECOGNITION_ONLY`) | Exact OEM identity exists in the supplement (or freeze) but is not Match-scoring eligible. | No |
| **Verified complete configuration** (`VERIFIED_COMPLETE_CONFIGURATION`) | Head + resolved MATCH_ELIGIBLE shaft + loft + handedness combination supported to the claim level. | Yes, if naming rules also pass |

A verified offering is **not** automatically a verified complete configuration. Naming an OEM shaft option requires a verified offering **and** a uniquely resolved `MATCH_ELIGIBLE` shaft. Claiming an assessed complete-driver configuration additionally requires loft and handedness evidence for that combination.

## Naming rules (fail closed)

`named_option_eligible` may be `true` only when all of the following hold:

1. `offering_verification_status = VERIFIED_OFFERING`
2. `shaft_identity_status = RESOLVED_MATCH_ELIGIBLE`
3. `shaft_key` resolves uniquely in loaded intelligence
4. Shaft `match_eligibility = MATCH_ELIGIBLE`
5. Shaft is **not** `oem_variant = AFTERMARKET`
6. `market_scope = UK_EU` for the UK pilot

Incomplete, unresolved, recognition-only, excluded, quarantined, or aftermarket-collision offerings never produce a named shaft recommendation.

## Fail-closed runtime behaviour

- Present but invalid overlay → loader throws; do not partially apply.
- Missing overlay → `loadOemDriverConfigsOrNull` returns `null`; head-only recommendations continue unchanged.
- Incomplete / unresolved offerings → retained for research; excluded from `namedOemOfferingsForHead`.

## Explicit non-collapses

- OEM tip ≠ aftermarket of the same commercial name (e.g. TM non-VeloCore Ventus ≠ Fujikura Ventus Blue 2019).
- Distinct generations and product lines (e.g. TENSEI AV-XLINK ≠ TENSEI AV Blue 2018).
- HL complete builds ≠ STANDARD catalogue heads (ALTA Quick stays off `ping|g430-max|2023`).
- Model-level loft / RH-LH evidence ≠ every shaft × loft × hand combination.

## Out of scope (Checkpoint B)

Shaft-selection engine, consumer results UI, inventory coexistence analytics, frozen eligibility edits, production deploy.
