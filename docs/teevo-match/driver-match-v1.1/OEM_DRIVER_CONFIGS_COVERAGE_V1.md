# OEM_DRIVER_CONFIGS_COVERAGE_V1

Checkpoint B research coverage for the five-model UK OEM shaft configuration pilot.

**Baseline:** staging tip at research start was `4b76354` (post-`614501b` questionnaire scroll fix). Frozen hashes unchanged:

- `heads.json` `1e4c0711732515e6df74a4d586eaa95da1cbf0f4`
- `shafts.json` `d77c369f734d212236acdff88b86ddcf0a3af1d4`

## 1. Driver models investigated

Five strategically selected DRIVER_V1 STANDARD heads, all UK recommendation-eligible:

| Catalogue key | Why selected |
|---|---|
| `ping\|g430-max\|2023` | UK_ESTABLISHED; fixture/presentation presence; only freeze family with OEM_STOCK MATCH_ELIGIBLE shafts that match manufacturer stock tables |
| `taylormade\|sim-max\|2020` | Established second-hand generation; appears in Fit fixtures; UK_OBSERVED |
| `callaway\|rogue-st-max\|2022` | UK_ESTABLISHED; strong UK retail evidence; multi-shaft stock matrix |
| `cobra\|aerojet\|2023` | UK_OBSERVED; appears in recommendation validation; distinct shaft brands |
| `wilson\|dynapwr-titanium\|2023` | UK_OBSERVED; Teevo Fit presentation/inventory fixtures; value second-hand relevance |

## 2. Models with verified OEM offering evidence

**5 / 5** models have at least one `VERIFIED_OFFERING` row (manufacturer or strong UK primary listing evidence of a stock/optional shaft).

## 3. Uniquely resolved MATCH_ELIGIBLE shaft variants

**8** named-eligible variants, all on PING G430 Max:

- `ping\|alta-cb-black\|2023\|55\|soft-regular|regular|stiff` (3)
- `ping\|tour-2-0-chrome\|2023\|65\|regular|stiff|x-stiff` (3)
- `ping\|tour-2-0-black\|2023\|65\|stiff|x-stiff` (2)

These are OEM_STOCK in SHAFT_V1 with mapped flex, high-confidence weight, and resolved launch — sufficient to distinguish slower vs mid vs faster swing-speed guidance in a later Checkpoint C engine.

## 4. Unresolved shaft identities

Counted as offerings with `shaft_identity_status` in `{UNRESOLVED, AFTERMARKET_COLLISION_BLOCKED}` plus recognition-only / incomplete rows that cannot name:

| Status | Count (pilot rows) |
|---|---|
| `UNRESOLVED` | 4 |
| `AFTERMARKET_COLLISION_BLOCKED` | 8 |
| `RECOGNITION_ONLY` | 1 |
| `INCOMPLETE_OFFERING_EVIDENCE` (ALTA Quick HL scope) | 1 |

**Named-eligible rate:** 8 / 21 offerings (≈ 38%), concentrated on **1 / 5** heads.

## 5. Verified head–shaft relationships

**19** `VERIFIED_OFFERING` relationships (including blocked optional aftermarket-stocked PING options).  
**8** of those are also named-eligible.

## 6. Fully supported configurations

**0** `VERIFIED_COMPLETE_CONFIGURATION` rows.

Head loft lists and (where evidenced) RH/LH are recorded at member or partial offering level only. No shaft × loft × handedness claim is promoted.

## 7. Missing or uncertain loft and handedness evidence

| Model | Loft | Handedness |
|---|---|---|
| PING G430 Max | 9 / 10.5 / 12 evidenced at head; not per shaft | BOTH at head; offering handedness `UNKNOWN` |
| SIM Max | 9 / 10.5 / 12; 12° RH-only nuance on sell sheet not expanded into LH claims for 12° | BOTH for 9/10.5; offering `UNKNOWN` |
| Rogue ST Max | 9 / 10.5 / 12 | BOTH at head listings; offering `UNKNOWN` |
| Aerojet | Partial retailer loft×shaft SKU pairs recorded on some offerings | `UNKNOWN` |
| DYNAPWR Titanium | 9 / 10.5 / 13 | `UNKNOWN` |

## 8. Common identity problems

1. **OEM tip vs aftermarket collision** — Ventus, Cypher, Helium Nanocore, Kai'li, Smoke Red RDX appear as stock names but freeze rows are `AFTERMARKET` (or wrong generation).
2. **Missing OEM_SPECIFIC / OEM_STOCK rows** for Callaway, Cobra, Wilson, and TM SIM-era non-VeloCore Ventus Blue **6** / Ventus Red **5**.
3. **Recognition-only without scoring fields** — TM non-VeloCore Ventus Blue 5 exists in the identity supplement but cannot enter Match scoring.
4. **Product-line drift** — TENSEI AV-XLINK ≠ TENSEI AV Blue 2018.
5. **HL contamination risk** — ALTA Quick must stay off STANDARD G430 Max even though OEM_STOCK rows exist.

## 9. Sources used

- PING EU G430 MAX Driver: https://eu.ping.com/en-gb/golf-clubs/drivers/g430-max-driver
- TaylorMade SIM Max sell sheet PDF (2020 stock Ventus Blue 6 / Red 5)
- TaylorMade Custom Component booklet (2021-03-02) — recognition-only Ventus Blue 5 evidence
- GolfOnline UK Callaway Rogue ST MAX specifications
- Greaves Sports UK Cobra Aerojet stock configurations
- Bang Average Golf Wilson Dynapower review (2023) + corroborating UK retail listings for Smoke Red RDX on Titanium
- Frozen DRIVER_V1 / SHAFT_V1 / SHAFT_IDENTITY_SUPPLEMENT_V1 / UK head-relevance / head-config overlays

## 10. Recommended next models to investigate

Only after a **SHAFT_V1 OEM identity research pass** (new MATCH_ELIGIBLE OEM_STOCK / OEM_SPECIFIC rows — do not silently reclassify aftermarket):

1. PING G430 SFT / G430 LST (extend PING OEM_STOCK coverage)
2. TaylorMade Stealth / Stealth 2 Max (document OEM tip generations carefully)
3. Callaway Paradym / Ai Smoke Max (newer Denali OEM_SPECIFIC may help later gens only)
4. Titleist TSR2 / TSR3 (often distinct OEM stock maps)
5. Cobra Darkspeed / Aerojet Max-D siblings

## Feasibility assessment (Checkpoint B gate)

| Question | Finding |
|---|---|
| Do enough OEM offerings resolve to eligible frozen shafts? | **Only for PING G430 Max** among the five. Four of five models are evidence-rich but identity-blocked. |
| Is flex / weight / launch evidence enough to distinguish options? | **Yes for the eight PING named options** (soft-regular→x-stiff; HIGH→LOW launch). Not usable yet for unresolved OEM tips. |
| Is configuration evidence precise enough? | **Yes for head–shaft offering claims** when status fields are respected. **No** complete loft×hand×shaft claims in this pilot. |
| Useful across swing speeds? | **Yes within PING-named set**; not yet across brands. |

### Exact Checkpoint C recommendation

**Proceed to Checkpoint C with a constrained scope:**

1. Implement the shaft-selection engine against `namedOemOfferingsForHead` only (fail closed).
2. Expect named shaft options primarily on PING G430 Max in this pilot overlay; other researched heads remain head-only until OEM identities are added.
3. **Do not** change frozen shaft eligibility to unblock SIM / Rogue / Aerojet / Wilson.
4. Smallest defensible remedy for broader brand coverage: a separate frozen-data research milestone that adds OEM_SPECIFIC / OEM_STOCK MATCH_ELIGIBLE identities (especially TM non-VeloCore Ventus Blue 6 / Red 5, Callaway Cypher / AV-XLINK tips, Cobra Helium / Kai'li tips, Wilson Smoke Red RDX OEM tip) — then extend `oem-driver-configs.v1.json`.

If product requires multi-brand named shafts before any Checkpoint C work, **pause C** and run that identity research first. Architecture itself is validated by the PING path.
