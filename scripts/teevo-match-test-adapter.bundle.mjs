// lib/match/uk-head-relevance.ts
var MATCH_UK_HEAD_RELEVANCE_VERSION = "MATCH_UK_HEAD_RELEVANCE_V1";

// lib/match/head-config-overlay.ts
var MATCH_HEAD_CONFIG_OVERLAY_VERSION = "MATCH_HEAD_CONFIG_OVERLAY_V1";

// lib/match/shaft-identity-policy.ts
var MATCH_SHAFT_IDENTITY_SUPPLEMENT_VERSION = "SHAFT_IDENTITY_SUPPLEMENT_V1";

// lib/match/versions.ts
var MATCH_CONTRACT_VERSION = "MATCH_DRIVER_CONTRACT_V1.3";
var MATCH_LOGIC_VERSION = "DRIVER_MATCH_LOGIC_V1.2";
var MATCH_HEADS_VERSION = "DRIVER_V1_2026-10-16";
var MATCH_SHAFTS_VERSION = "SHAFT_V1_2026-10-16";
var MATCH_MARKETPLACE_BRAND_FILTER_VERSION = "MATCH_MARKETPLACE_BRAND_FILTER_V1";
function matchAdapterVersions() {
  return {
    contract: MATCH_CONTRACT_VERSION,
    logic: MATCH_LOGIC_VERSION,
    heads: MATCH_HEADS_VERSION,
    shafts: MATCH_SHAFTS_VERSION,
    head_config_overlay: MATCH_HEAD_CONFIG_OVERLAY_VERSION,
    uk_head_relevance: MATCH_UK_HEAD_RELEVANCE_VERSION
  };
}

// lib/match/bands.ts
function matchBandFromScore(score) {
  if (score >= 85) return "EXCELLENT_MATCH";
  if (score >= 75) return "VERY_GOOD_MATCH";
  if (score >= 65) return "GOOD_MATCH";
  return "DO_NOT_ACTIVELY_RECOMMEND";
}
function confidenceFromScore(score) {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
}
var BAND_RANK = {
  DO_NOT_ACTIVELY_RECOMMEND: 0,
  GOOD_MATCH: 1,
  VERY_GOOD_MATCH: 2,
  EXCELLENT_MATCH: 3
};

// lib/match/scoring/curves.ts
function lerpKnots(gap, knots) {
  if (gap <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [g0, s0] = knots[i - 1];
    const [g1, s1] = knots[i];
    if (gap <= g1) {
      if (g1 === g0) return s1;
      const t = (gap - g0) / (g1 - g0);
      return s0 + t * (s1 - s0);
    }
  }
  return knots[knots.length - 1][1];
}
var MINIMUM = [
  [0, 100],
  [0.5, 90],
  [1, 80],
  [1.5, 67.5],
  [2, 55],
  [3, 30],
  [4, 0]
];
var DIRECTION = [
  [0, 100],
  [0.5, 92.5],
  [1, 85],
  [2, 60],
  [3, 35],
  [4, 15]
];
var LAUNCH = [
  [0, 100],
  [0.5, 92.5],
  [1, 85],
  [2, 65],
  [3, 40],
  [4, 20]
];
function stepCurve(gap, steps, beyond) {
  for (const [limit, score] of steps) {
    if (gap <= limit) return score;
  }
  return beyond;
}
function scoreMinimumNeed(gap) {
  return lerpKnots(Math.max(0, gap), MINIMUM);
}
function scoreDirection(gap) {
  return lerpKnots(Math.max(0, gap), DIRECTION);
}
function scoreLaunch(gap) {
  return lerpKnots(Math.max(0, gap), LAUNCH);
}
function scoreLoft(gap) {
  if (gap <= 0) return 100;
  return stepCurve(
    gap,
    [
      [0.5, 90],
      [1, 75],
      [1.5, 55]
    ],
    30
  );
}
function scoreFlex(gap) {
  if (gap <= 0) return 100;
  return stepCurve(
    gap,
    [
      [0.5, 90],
      [1, 75],
      [1.5, 55],
      [2, 35]
    ],
    0
  );
}
function scoreWeight(gap) {
  if (gap <= 0) return 100;
  return stepCurve(
    gap,
    [
      [5, 85],
      [10, 65],
      [15, 40]
    ],
    20
  );
}
function scoreDimensionCurve(dimension, gap) {
  switch (dimension) {
    case "minimum":
      return scoreMinimumNeed(gap);
    case "direction":
      return scoreDirection(gap);
    case "launch":
      return scoreLaunch(gap);
    case "loft":
      return scoreLoft(gap);
    case "flex":
      return scoreFlex(gap);
    case "weight":
      return scoreWeight(gap);
  }
}

// lib/match/scoring/aggregate.ts
function aggregateFit(dimensions) {
  let num = 0;
  let den = 0;
  for (const d of dimensions) {
    if (!(d.reliability > 0)) continue;
    num += d.score * d.weight * d.reliability;
    den += d.weight * d.reliability;
  }
  if (den === 0) {
    return {
      score: null,
      scorable: false,
      reason: "NO_ACTIVE_FIT_DIMENSIONS"
    };
  }
  return { score: num / den, scorable: true };
}

// lib/match/guardrails.ts
function guardrailForGap(dimension, gap) {
  if (gap == null || !Number.isFinite(gap)) {
    return { suppressed: false, ceiling: null };
  }
  if (dimension === "flex") {
    if (gap > 2) return { suppressed: true, ceiling: null };
    if (gap > 1.5) return { suppressed: false, ceiling: "GOOD_MATCH" };
    return { suppressed: false, ceiling: null };
  }
  if (dimension === "loft") {
    if (gap > 2.5) return { suppressed: true, ceiling: null };
    if (gap > 1.5) return { suppressed: false, ceiling: "GOOD_MATCH" };
    return { suppressed: false, ceiling: null };
  }
  if (dimension === "direction") {
    if (gap >= 4) return { suppressed: true, ceiling: null };
    if (gap >= 3) return { suppressed: false, ceiling: "GOOD_MATCH" };
    return { suppressed: false, ceiling: null };
  }
  return { suppressed: false, ceiling: null };
}
function applyGuardrails(gaps) {
  const flex = guardrailForGap("flex", gaps.flex);
  const loft = guardrailForGap("loft", gaps.loft);
  const direction = guardrailForGap("direction", gaps.direction);
  const suppressed = flex.suppressed || loft.suppressed || direction.suppressed;
  let ceiling = null;
  if (flex.ceiling || loft.ceiling || direction.ceiling) {
    ceiling = "GOOD_MATCH";
  }
  if (gaps.head_launch != null && gaps.shaft_launch != null && gaps.head_launch >= 3 && gaps.shaft_launch >= 3) {
    ceiling = "GOOD_MATCH";
  }
  return { suppressed, ceiling };
}

// lib/match/confidence.ts
function clampConfidence(score) {
  return Math.max(0, Math.min(100, score));
}
function aggregateConfidence(parts) {
  const score = clampConfidence(
    0.45 * clampConfidence(parts.golfer) + 0.35 * clampConfidence(parts.equipment) + 0.2 * clampConfidence(parts.listing)
  );
  return { score, confidence: confidenceFromScore(score) };
}
function reliabilityToEquipmentPoints(reliability) {
  if (reliability >= 1) return 100;
  if (reliability >= 0.85) return 80;
  if (reliability >= 0.5) return 50;
  return 0;
}

// lib/match/regions.ts
var SPEED = [
  { lim: 80, flex: [0, 2], weight: [40, 55], loft: [10.5, 12.5] },
  { lim: 90, flex: [1, 2.5], weight: [45, 60], loft: [10, 12] },
  { lim: 100, flex: [2, 3], weight: [50, 65], loft: [9, 11.5] },
  { lim: 110, flex: [2.5, 4], weight: [55, 70], loft: [8.5, 10.5] },
  { lim: Infinity, flex: [3, 5], weight: [60, 75], loft: [8, 10.5] }
];
var CARRY = [
  { lim: 180, flex: [0, 2] },
  { lim: 200, flex: [2, 2] },
  { lim: 220, flex: [2, 2] },
  { lim: 260, flex: [2, 3] },
  { lim: 280, flex: [3, 3] },
  { lim: Infinity, flex: [3, 4] }
];
function approximateSpeedWindow(band) {
  if (band === "SLOW") {
    return { flex: [0, 2.5], weight: [40, 60], loft: [10, 12.5] };
  }
  if (band === "MEDIUM") {
    return { flex: [2, 3], weight: [50, 65], loft: [9, 11.5] };
  }
  return { flex: [2.5, 5], weight: [55, 75], loft: [8, 10.5] };
}
function speedRegion(speed) {
  for (const row of SPEED) {
    if (speed < row.lim) {
      return { flex: row.flex, weight: row.weight, loft: row.loft };
    }
  }
  return SPEED[SPEED.length - 1];
}
function carryRegion(carry) {
  for (const row of CARRY) {
    if (carry < row.lim) {
      return { flex: row.flex, weight: null, loft: null };
    }
  }
  return { flex: CARRY[CARRY.length - 1].flex, weight: null, loft: null };
}

// lib/match/category.ts
function launchCategoryFromNumeric(x) {
  if (x == null) return "UNRESOLVED";
  const mag = Math.abs(x);
  const n = mag < 0.5 ? 0 : mag < 1.5 ? 1 : 2;
  const signed = n === 0 ? 0 : x > 0 ? n : -n;
  return ["LOW", "MID_LOW", "MID", "MID_HIGH", "HIGH"][signed + 2];
}
function directionCategoryFromNumeric(x) {
  if (x == null) return "UNRESOLVED";
  const mag = Math.abs(x);
  const n = mag < 0.5 ? 0 : mag < 1.5 ? 1 : 2;
  const signed = n === 0 ? 0 : x > 0 ? n : -n;
  return [
    "STRONG_FADE_ASSIST",
    "FADE_ASSIST",
    "NEUTRAL",
    "DRAW_ASSIST",
    "STRONG_DRAW_ASSIST"
  ][signed + 2];
}
function targetCategories(value) {
  return {
    launch: launchCategoryFromNumeric(value),
    direction: directionCategoryFromNumeric(value)
  };
}
function directionBiasToNumeric(bias) {
  switch ((bias || "").toUpperCase()) {
    case "STRONG_FADE":
      return -2;
    case "FADE":
      return -1;
    case "NEUTRAL":
      return 0;
    case "DRAW":
      return 1;
    case "STRONG_DRAW":
      return 2;
    default:
      return null;
  }
}
function launchTendencyToNumeric(tendency) {
  switch ((tendency || "").toUpperCase()) {
    case "LOW":
      return -2;
    case "MID_LOW":
      return -1;
    case "MID":
      return 0;
    case "MID_HIGH":
      return 1;
    case "HIGH":
      return 2;
    case "LOW_MID":
      return -1.5;
    default:
      return null;
  }
}
function evidenceReliability(band) {
  switch ((band || "").toUpperCase()) {
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 0.85;
    case "LOW":
      return 0.5;
    default:
      return 0;
  }
}

// lib/match/loft.ts
function loftReachable(input) {
  const mode = (input.mode || "NONE").toUpperCase();
  const stated = input.stated;
  if (mode === "DELTA_RANGE") {
    const min = input.min ?? 0;
    const max = input.max ?? 0;
    return [stated + min, stated + max];
  }
  if (mode === "PUBLISHED_SETTINGS") {
    if (Array.isArray(input.settings) && input.settings.length > 0) {
      return [...input.settings];
    }
    if (input.min != null && input.max != null) {
      return [input.min, input.max];
    }
    return [stated];
  }
  return [stated];
}
function rangeGap(valueOrReachable, min, max) {
  const values = Array.isArray(valueOrReachable) ? valueOrReachable : [valueOrReachable];
  let best = Infinity;
  for (const v of values) {
    if (v >= min && v <= max) return 0;
    if (v < min) best = Math.min(best, min - v);
    else best = Math.min(best, v - max);
  }
  return best;
}

// lib/match/eligibility.ts
function isMatchEligible(input) {
  return input.category === "DRIVER" && input.subtype === "STANDARD" && input.head_version === "DRIVER_V1" && input.head_eligible === true && input.conformity !== "NON_CONFORMING" && input.head_key_count === 1 && input.shaft_key_count === 1 && input.shaft_eligibility === "MATCH_ELIGIBLE" && input.same_oem_variant === true && input.purchasable === true && input.handedness_matches === true && input.usable_loft === true;
}

// lib/match/parse.ts
function parseNumber(raw) {
  if (raw === "" || raw == null) {
    return { value: null, diagnostic: false };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { value: null, diagnostic: true };
    return { value: raw, diagnostic: false };
  }
  const s = String(raw).trim();
  if (s === "") return { value: null, diagnostic: false };
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) {
    return { value: null, diagnostic: true };
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, diagnostic: true };
  return { value: n, diagnostic: false };
}

// lib/match/util.ts
function sortedSetValues(set) {
  return Array.from(set.values()).sort();
}
function firstMapValue(map) {
  const values = Array.from(map.values());
  return values[0];
}
function deepFreezeRecord(record) {
  return Object.freeze({ ...record });
}

// lib/match/identity.ts
function resolveIdentity(matches) {
  const byKey = /* @__PURE__ */ new Map();
  for (const m of matches) {
    if (!byKey.has(m.key)) byKey.set(m.key, m);
  }
  if (byKey.size === 0) {
    return {
      resolved_key: null,
      eligible: false,
      reason: "UNRESOLVED_IDENTITY"
    };
  }
  if (byKey.size > 1) {
    return {
      resolved_key: null,
      eligible: false,
      reason: "AMBIGUOUS_IDENTITY"
    };
  }
  const only = firstMapValue(byKey);
  const eligible = only.eligibility === "MATCH_ELIGIBLE";
  return {
    resolved_key: only.key,
    eligible,
    reason: eligible ? null : "INELIGIBLE_IDENTITY"
  };
}

// lib/match/marketplace.ts
function moneySavingQualifies(bestPricePence, candidatePricePence) {
  const savings = bestPricePence - candidatePricePence;
  return savings >= 2e3 && 10 * savings >= bestPricePence;
}
function confidenceScoreOf(c) {
  if (typeof c.confidence_score === "number") return c.confidence_score;
  if (c.confidence === "HIGH") return 100;
  if (c.confidence === "MEDIUM") return 70;
  return 0;
}
function equipmentOrder(a, b) {
  const br = BAND_RANK[b.band] - BAND_RANK[a.band];
  if (br !== 0) return br;
  if (b.score !== a.score) return b.score - a.score;
  const cf = confidenceScoreOf(b) - confidenceScoreOf(a);
  if (cf !== 0) return cf;
  if (a.listing_id < b.listing_id) return -1;
  if (a.listing_id > b.listing_id) return 1;
  return 0;
}
function toPence(priceGbp) {
  return Math.round(priceGbp * 100);
}
function selectMarketplaceSlots(candidates, budget) {
  const ids = /* @__PURE__ */ new Set();
  for (const c of candidates) {
    if (ids.has(c.listing_id)) {
      throw new Error(`Duplicate listing_id in marketplace snapshot: ${c.listing_id}`);
    }
    ids.add(c.listing_id);
  }
  const eligible = candidates.filter(
    (c) => !c.suppressed && BAND_RANK[c.band] >= 1 && (c.confidence === "HIGH" || c.confidence === "MEDIUM")
  ).slice().sort(equipmentOrder);
  const best = eligible[0] ?? null;
  let near = best ? eligible.filter(
    (c) => BAND_RANK[c.band] >= 2 && best.score - c.score <= 7
  ) : [];
  if (budget != null && near.some((c) => c.price_gbp <= budget)) {
    near = near.filter((c) => c.price_gbp <= budget);
  }
  near = near.slice().sort((a, b) => {
    if (a.price_gbp !== b.price_gbp) return a.price_gbp - b.price_gbp;
    return equipmentOrder(a, b);
  });
  let value = near[0] ?? null;
  if (value && best) {
    if (!moneySavingQualifies(toPence(best.price_gbp), toPence(value.price_gbp))) {
      value = null;
    }
  }
  const affordable = eligible.filter(
    (c) => budget == null || c.price_gbp <= budget
  );
  affordable.sort((a, b) => {
    if (a.price_gbp !== b.price_gbp) return a.price_gbp - b.price_gbp;
    return equipmentOrder(a, b);
  });
  const cheap = affordable[0] ?? null;
  const slots = {
    BEST_MATCH: best?.listing_id ?? null,
    BEST_VALUE: value?.listing_id ?? null,
    BUDGET_OPTION: cheap?.listing_id ?? null
  };
  return {
    slots,
    unique_cards: new Set(
      Object.values(slots).filter((v) => v != null)
    ).size
  };
}
function mergeLabels(slots) {
  const cards = [];
  const unfilled = [];
  for (const label of ["BEST_MATCH", "BEST_VALUE", "BUDGET_OPTION"]) {
    const target = slots[label];
    if (target == null) {
      unfilled.push(label);
      continue;
    }
    let card = cards.find((c) => c.listing_id === target);
    if (!card) {
      card = { listing_id: target, labels: [] };
      cards.push(card);
    }
    card.labels.push(label);
  }
  return { cards, unfilled_slots: unfilled };
}
function brandMarketplace(input) {
  const known = new Set(input.known_brand_ids);
  const raw = input.selected_brand_ids;
  if (raw != null && raw.length > 0) {
    const invalid = Array.from(
      new Set(raw.filter((id) => !known.has(id)))
    ).sort();
    if (invalid.length > 0) {
      return { error: "INVALID_BRAND_SELECTION", invalid_ids: invalid };
    }
  }
  const selected = raw == null || raw.length === 0 ? [] : Array.from(new Set(raw)).sort();
  const scope = selected.length > 0 ? "SELECTED_BRANDS" : "ALL_BRANDS";
  const fit_snapshot = input.candidates.slice().sort(
    (a, b) => a.listing_id < b.listing_id ? -1 : a.listing_id > b.listing_id ? 1 : 0
  ).map((c) => ({
    listing_id: c.listing_id,
    score: c.score,
    band: c.band,
    confidence: c.confidence,
    suppressed: !!c.suppressed
  }));
  let pool = input.candidates.filter(
    (c) => c.publicly_purchasable !== false
  );
  if (selected.length > 0) {
    const allow = new Set(selected);
    pool = pool.filter((c) => c.head_brand_id && allow.has(c.head_brand_id));
  }
  const { slots, unique_cards } = selectMarketplaceSlots(pool, input.budget);
  const hasResults = unique_cards > 0;
  let state = "RESULTS";
  if (!hasResults) {
    state = selected.length > 0 ? "NO_QUALIFYING_IN_SELECTED_BRANDS" : "NO_QUALIFYING_INVENTORY";
  }
  return {
    selected_brand_ids: selected,
    scope,
    slots,
    unique_cards,
    state,
    show_all_brands_action: selected.length > 0 && state !== "RESULTS",
    fit_snapshot
  };
}

// lib/match/types.ts
var DIMENSION_WEIGHTS = {
  forgiveness: 15,
  stability: 15,
  direction: 13,
  head_launch: 10,
  head_spin: 6,
  workability: 5,
  loft: 14,
  flex: 10,
  weight: 5,
  shaft_launch: 4,
  shaft_spin: 3
};
var DIMENSION_NAMES = Object.keys(DIMENSION_WEIGHTS);

// lib/match/requirements.ts
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function asNum(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function asStr(v) {
  if (v == null) return null;
  return String(v);
}
var SPEED_EVIDENCE_METHODS = /* @__PURE__ */ new Set([
  "measured_mph",
  "estimated_mph",
  "carry_yards",
  "band",
  "unknown"
]);
function readSpeedEvidence(raw) {
  const evidence = raw.speed_evidence;
  if (!evidence || typeof evidence !== "object") return { method: null, band: null };
  const method = String(evidence.method ?? "");
  if (!SPEED_EVIDENCE_METHODS.has(method)) return { method: null, band: null };
  const bandRaw = String(evidence.band ?? "").toUpperCase();
  const band = bandRaw === "SLOW" || bandRaw === "MEDIUM" || bandRaw === "FAST" ? bandRaw : null;
  return { method, band };
}
function normalizeRequirements(raw, headsByKey) {
  const src = Object.fromEntries(
    DIMENSION_NAMES.map((k) => [k, /* @__PURE__ */ new Set()])
  );
  const flags = /* @__PURE__ */ new Set();
  let g = 3;
  let f = 3;
  let w = 2;
  for (const k of ["forgiveness", "stability", "workability"]) {
    src[k].add("BASELINE");
  }
  const handedness = asStr(raw.handedness) || "RIGHT";
  const handicap = asNum(raw.handicap);
  const strike = asStr(raw.strike_consistency);
  const obj = asStr(raw.primary_objective);
  const traj = asStr(raw.typical_trajectory);
  const start = asStr(raw.typical_start_direction);
  const curve = asStr(raw.typical_curvature);
  const severity = asStr(raw.miss_severity) || "UNKNOWN";
  const speed = asNum(raw.club_speed_mph);
  const carry = asNum(raw.carry_distance_yards);
  const inputConfidence = asStr(raw.input_confidence) || "HIGH";
  const mod = (a2, b2, c, source) => {
    g += a2;
    f += b2;
    w += c;
    for (const [k, v] of [
      ["forgiveness", a2],
      ["stability", b2],
      ["workability", c]
    ]) {
      if (v) src[k].add(source);
    }
  };
  if (handicap != null) {
    if (handicap < 6) mod(0, 0, 0.5, "HANDICAP");
    else if (handicap < 13) mod(0, 0, 0, "HANDICAP");
    else if (handicap < 21) mod(0.25, 0.25, 0, "HANDICAP");
    else if (handicap < 31) mod(0.5, 0.5, -0.25, "HANDICAP");
    else mod(0.75, 0.75, -0.5, "HANDICAP");
  }
  if (strike === "HIGH" || strike === "MEDIUM" || strike === "LOW") {
    const m = strike === "HIGH" ? [-0.5, -0.5, 0.5] : strike === "MEDIUM" ? [0, 0, 0] : [1, 1.5, -0.5];
    mod(m[0], m[1], m[2], "STRIKE_CONSISTENCY");
    for (const k of ["forgiveness", "stability", "workability"]) {
      src[k].add("STRIKE_CONSISTENCY");
    }
  }
  const pattern = asStr(raw.strike_pattern);
  const strikeKnown = strike === "HIGH" || strike === "MEDIUM" || strike === "LOW";
  if (pattern === "VARIABLE" && !strikeKnown) {
    mod(0.5, 0.5, 0, "STRIKE_PATTERN");
  }
  const sign = handedness === "RIGHT" ? 1 : -1;
  const a = { LEFT: -0.5, RIGHT: 0.5 }[start || ""] != null ? { LEFT: -0.5, RIGHT: 0.5 }[start] * sign : 0;
  const b = { LEFT: -1.5, RIGHT: 1.5 }[curve || ""] != null ? { LEFT: -1.5, RIGHT: 1.5 }[curve] * sign : 0;
  const stable = start === "LEFT" || start === "CENTRE" || start === "RIGHT" || curve === "LEFT" || curve === "STRAIGHT" || curve === "RIGHT";
  const rawDir = a + b;
  const sevMul = { SMALL: 0.67, MODERATE: 1, LARGE: 1.33, UNKNOWN: 1 }[severity] ?? 1;
  const ds = clamp(rawDir * sevMul, -2, 2);
  const os = obj === "REDUCE_RIGHT_MISS" ? 1.5 * sign : obj === "REDUCE_LEFT_MISS" ? -1.5 * sign : null;
  let direction;
  if (curve === "VARIABLE") {
    direction = null;
    flags.add("TWO_WAY_MISS");
    mod(1, 1.5, 0, "BALL_FLIGHT");
  } else {
    direction = stable ? clamp(ds + 0.5 * (os ?? 0), -2, 2) : os;
    if (stable) src.direction.add("BALL_FLIGHT");
    if (os != null) src.direction.add("PRIMARY_OBJECTIVE");
    if (rawDir && severity !== "UNKNOWN") {
      const sm = { SMALL: [0.25, 0.25, 0], MODERATE: [0.5, 0.5, 0], LARGE: [0.75, 1, 0] }[severity];
      if (sm) mod(sm[0], sm[1], sm[2], "BALL_FLIGHT");
    }
    if (os != null && ds * os < 0 && Math.abs(ds) >= 1 && Math.abs(os) >= 1) {
      flags.add("DIRECTION_INPUT_CONFLICT");
    }
    if (start === "UNKNOWN" !== (curve === "UNKNOWN") || start === "VARIABLE") {
      flags.add("DIRECTION_EVIDENCE_PARTIAL");
    }
  }
  const objMod = {
    FORGIVENESS: [1.5, 1, -0.5],
    ACCURACY: [0.5, 1.5, 0],
    CONTROL: [-0.25, 1, 1.5]
  }[obj || ""] ?? [0, 0, 0];
  mod(objMod[0], objMod[1], objMod[2], "PRIMARY_OBJECTIVE");
  const ts = traj === "LOW" ? 1 : traj === "MID" ? 0 : traj === "HIGH" ? -1 : null;
  const hs = obj === "HIGHER_FLIGHT" ? 1.5 : obj === "LOWER_FLIGHT" ? -1.5 : null;
  const launch = ts == null && hs == null ? null : clamp((ts ?? 0) + (hs ?? 0), -2, 2);
  const shaftlaunch = launch == null ? null : clamp(
    (ts ?? 0) * 0.5 + (hs == null ? 0 : hs > 0 ? 0.5 : -0.5),
    -2,
    2
  );
  if (ts != null) {
    src.head_launch.add("TRAJECTORY");
    src.shaft_launch.add("TRAJECTORY");
  }
  if (hs != null) {
    src.head_launch.add("PRIMARY_OBJECTIVE");
    src.shaft_launch.add("PRIMARY_OBJECTIVE");
  }
  if (ts != null && hs != null && ts * hs < 0) {
    flags.add("LAUNCH_INPUT_CONFLICT");
  }
  const currentKey = asStr(raw.current_driver_key);
  const current = currentKey ? headsByKey[currentKey] : void 0;
  const resolved = current != null;
  const satisfaction = asStr(raw.current_club_satisfaction) || "UNKNOWN";
  const intent = !resolved || satisfaction === "UNKNOWN" ? "UNANCHORED" : satisfaction === "HIGH" ? "PRESERVE" : satisfaction === "MEDIUM" ? "OPTIMISE" : "CORRECT";
  const currentLoft = asNum(raw.current_loft_deg);
  const usable = resolved && String(current.driver_subtype || "").toUpperCase() === "STANDARD" && currentLoft != null && currentLoft > 0 && (satisfaction === "HIGH" || satisfaction === "MEDIUM");
  let flex = null;
  let weight = null;
  let loft = null;
  const speedEvidence = readSpeedEvidence(raw);
  const useMeasured = speedEvidence.method === "measured_mph" || speedEvidence.method == null && speed != null && speed > 0;
  const useEstimated = speedEvidence.method === "estimated_mph" && speed != null && speed > 0;
  const useBand = speedEvidence.method === "band";
  const useCarry = speedEvidence.method === "carry_yards" || speedEvidence.method == null && !useMeasured && carry != null && carry > 0;
  if (useMeasured || useEstimated) {
    const region = speedRegion(speed);
    flex = region.flex;
    weight = region.weight;
    loft = region.loft;
    const source = useMeasured ? "MEASURED_SPEED" : "ESTIMATED_SPEED";
    for (const k of ["flex", "weight", "loft"]) {
      src[k].add(source);
    }
    if (carry != null && carry > 0) {
      const cFlex = carryRegion(carry).flex;
      if (Math.abs((flex[0] + flex[1]) / 2 - (cFlex[0] + cFlex[1]) / 2) >= 1) {
        flags.add("SPEED_CARRY_CONFLICT");
      }
    }
  } else if (useBand && speedEvidence.band) {
    const bandWindow = approximateSpeedWindow(speedEvidence.band);
    if (bandWindow) {
      flex = bandWindow.flex;
      weight = bandWindow.weight;
      loft = bandWindow.loft;
      for (const k of ["flex", "weight", "loft"]) {
        src[k].add("APPROXIMATE_SPEED");
      }
    }
  } else if (useCarry && carry != null && carry > 0) {
    flex = carryRegion(carry).flex;
    src.flex.add("CARRY_PROXY");
    if (usable) {
      loft = [currentLoft - 1, currentLoft + 1];
      src.loft.add("CURRENT_LOFT");
    }
  } else if (usable) {
    loft = [currentLoft - 1, currentLoft + 1];
    src.loft.add("CURRENT_LOFT");
  }
  if (loft != null) {
    const shift = clamp(
      (ts ?? 0) * 0.5 + (hs == null ? 0 : hs > 0 ? 0.5 : -0.5),
      -1,
      1
    );
    loft = [loft[0] + shift, loft[1] + shift];
    if (ts) src.loft.add("TRAJECTORY");
    if (hs) src.loft.add("PRIMARY_OBJECTIVE");
    if (speed != null && usable && Math.max(loft[0] - currentLoft, currentLoft - loft[1], 0) > 1) {
      flags.add("LOFT_EVIDENCE_CONFLICT");
    }
  }
  const active = {
    forgiveness: true,
    stability: true,
    workability: true,
    direction: direction != null,
    head_launch: launch != null,
    shaft_launch: shaftlaunch != null,
    head_spin: false,
    shaft_spin: false,
    loft: loft != null,
    flex: flex != null,
    weight: weight != null
  };
  const affected = {
    SPEED_CARRY_CONFLICT: ["flex", "weight", "loft"],
    DIRECTION_INPUT_CONFLICT: ["direction"],
    DIRECTION_EVIDENCE_PARTIAL: ["direction"],
    TWO_WAY_MISS: ["direction"],
    LAUNCH_INPUT_CONFLICT: ["head_launch", "shaft_launch", "loft"],
    LOFT_EVIDENCE_CONFLICT: ["loft"]
  };
  const conf = {};
  for (const k of DIMENSION_NAMES) {
    const cf = Object.keys(affected).filter((code) => flags.has(code) && affected[code].includes(k)).sort();
    let sources = sortedSetValues(src[k]);
    let band;
    if (!active[k]) {
      band = "UNRESOLVED";
      sources = [];
    } else {
      let n = sources.includes("MEASURED_SPEED") ? 3 : sources.includes("CARRY_PROXY") || sources.includes("ESTIMATED_SPEED") || sources.includes("APPROXIMATE_SPEED") ? 1 : sources.some((s) => s !== "BASELINE" && s !== "HANDICAP") ? 2 : 1;
      n = Math.min(
        n,
        { HIGH: 3, MEDIUM: 2, LOW: 1 }[inputConfidence]
      );
      if (cf.length) n = Math.max(1, n - 1);
      band = { 1: "LOW", 2: "MEDIUM", 3: "HIGH" }[n];
    }
    conf[k] = { band, source_codes: sources, conflict_codes: cf };
  }
  return {
    handedness,
    recommendation_intent: intent,
    head_launch_target: launchCategoryFromNumeric(launch),
    head_launch_target_numeric: launch,
    head_spin_target: "UNRESOLVED",
    forgiveness_requirement: clamp(g, 1, 5),
    stability_requirement: clamp(f, 1, 5),
    directional_target_numeric: direction,
    directional_requirement: directionCategoryFromNumeric(direction),
    workability_preference: clamp(w, 1, 5),
    driver_subtype_allowed: "STANDARD",
    preferred_loft_min_deg: loft ? loft[0] : null,
    preferred_loft_max_deg: loft ? loft[1] : null,
    shaft_weight_min_g: weight ? weight[0] : null,
    shaft_weight_max_g: weight ? weight[1] : null,
    shaft_flex_min_value: flex ? flex[0] : null,
    shaft_flex_max_value: flex ? flex[1] : null,
    shaft_launch_target: launchCategoryFromNumeric(shaftlaunch),
    shaft_launch_target_numeric: shaftlaunch,
    shaft_spin_target: "UNRESOLVED",
    shaft_torque_target_deg: null,
    conflict_flags: sortedSetValues(flags),
    requirement_confidence: conf
  };
}
function golferEvidenceConfidence(raw, flags) {
  let score = 100;
  const speed = asNum(raw.club_speed_mph);
  const carry = asNum(raw.carry_distance_yards);
  const speedEvidence = readSpeedEvidence(raw);
  if (speed == null) {
    const bandUsable = speedEvidence.method === "band" && speedEvidence.band != null;
    const carryUsable = carry != null && (speedEvidence.method == null || speedEvidence.method === "carry_yards");
    score -= bandUsable || carryUsable ? 10 : 25;
  }
  const unknownChecks = [
    ["typical_start_direction", 4],
    ["typical_curvature", 6],
    ["typical_trajectory", 6],
    ["strike_consistency", 6],
    ["primary_objective", 8]
  ];
  for (const [name, penalty] of unknownChecks) {
    const v = asStr(raw[name]);
    if (v == null || v === "UNKNOWN") score -= penalty;
  }
  const miss = asStr(raw.typical_curvature) === "VARIABLE" || asStr(raw.typical_start_direction) === "LEFT" || asStr(raw.typical_start_direction) === "RIGHT" || asStr(raw.typical_curvature) === "LEFT" || asStr(raw.typical_curvature) === "RIGHT";
  if (miss && asStr(raw.miss_severity) === "UNKNOWN") score -= 3;
  if (asNum(raw.handicap) == null) score -= 2;
  const ic = asStr(raw.input_confidence) || "HIGH";
  score -= ic === "MEDIUM" ? 5 : ic === "LOW" ? 15 : 0;
  if (flags.includes("DIRECTION_INPUT_CONFLICT")) score -= 10;
  if (flags.includes("SPEED_CARRY_CONFLICT")) score -= 5;
  if (flags.includes("LAUNCH_INPUT_CONFLICT") || flags.includes("LOFT_EVIDENCE_CONFLICT")) {
    score -= 5;
  }
  if (asStr(raw.typical_start_direction) === "VARIABLE" || asStr(raw.typical_curvature) === "VARIABLE") {
    score -= 5;
  }
  return clamp(score, 0, 100);
}

// lib/match/intelligence/load.ts
import { readFileSync as readFileSync2 } from "fs";
import { join as join2 } from "path";

// lib/match/brands.ts
function canonicalBrandId(brand) {
  if (brand == null) return null;
  const id = String(brand).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return id || null;
}
function buildBrandRegistry(heads) {
  const byId = {};
  for (const h of heads) {
    const raw = h.brand ?? h.Brand;
    if (typeof raw !== "string" || !raw.trim()) continue;
    const id = canonicalBrandId(raw);
    if (!id) continue;
    if (!byId[id]) {
      byId[id] = Object.freeze({ id, label: raw.trim() });
    }
  }
  const entries = Object.freeze(
    Object.values(byId).sort(
      (a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" })
    )
  );
  return Object.freeze({
    entries,
    ids: freezeStringSet(entries.map((e) => e.id)),
    byId: Object.freeze(byId)
  });
}
function freezeStringSet(values) {
  const ids = new Set(values);
  for (const key of ["add", "delete", "clear"]) {
    Object.defineProperty(ids, key, {
      configurable: false,
      enumerable: false,
      writable: false,
      value() {
        throw new TypeError("Cannot mutate frozen brand registry ids");
      }
    });
  }
  return Object.freeze(ids);
}
function validateBrandSelection(selected, registry) {
  if (selected == null || selected.length === 0) {
    return { ok: true, brand_ids: [], scope: "ALL_BRANDS" };
  }
  const invalid = [];
  const valid = /* @__PURE__ */ new Set();
  for (const raw of selected) {
    const id = String(raw);
    if (!registry.ids.has(id)) invalid.push(id);
    else valid.add(id);
  }
  if (invalid.length > 0) {
    return {
      ok: false,
      error: "INVALID_BRAND_SELECTION",
      invalid_ids: Array.from(new Set(invalid)).sort()
    };
  }
  return {
    ok: true,
    brand_ids: Array.from(valid).sort(),
    scope: "SELECTED_BRANDS"
  };
}

// lib/match/shaft-identity-supplement.ts
import { readFileSync } from "fs";
import { join } from "path";
var REQUIRED_TEXT = [
  "shaft_key",
  "manufacturer",
  "oem_brand",
  "model",
  "display_name",
  "generation",
  "flex",
  "aliases",
  "source_1_url"
];
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
function validateShaftIdentitySupplement(parsed, frozenShafts) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "MALFORMED_SUPPLEMENT", identities: [] };
  }
  const body = parsed;
  if (body.supplement_version !== MATCH_SHAFT_IDENTITY_SUPPLEMENT_VERSION) {
    return { ok: false, reason: "SUPPLEMENT_VERSION_REJECTED", identities: [] };
  }
  if (!Array.isArray(body.identities)) {
    return { ok: false, reason: "MALFORMED_SUPPLEMENT", identities: [] };
  }
  const frozenKeys = new Set(
    frozenShafts.map((row) => row.shaft_key).filter((key) => typeof key === "string" && key.length > 0)
  );
  const seen = /* @__PURE__ */ new Set();
  const identities = [];
  for (const row of body.identities) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    const identity = row;
    for (const field of REQUIRED_TEXT) {
      if (!text(identity[field])) {
        return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
      }
    }
    if (identity.match_eligibility !== "RECOGNITION_ONLY") {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    if (identity.intelligence_version !== MATCH_SHAFT_IDENTITY_SUPPLEMENT_VERSION) {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    const weight = identity.actual_weight_g;
    if (weight != null && (typeof weight !== "number" || !Number.isFinite(weight))) {
      return { ok: false, reason: "MALFORMED_IDENTITY", identities: [] };
    }
    const key = text(identity.shaft_key);
    if (seen.has(key) || frozenKeys.has(key)) {
      return { ok: false, reason: "DUPLICATE_CANONICAL_KEY", identities: [] };
    }
    seen.add(key);
    identities.push(identity);
  }
  return { ok: true, reason: null, identities };
}
function loadShaftIdentitySupplement(referenceDirectory, frozenShafts) {
  try {
    const parsed = JSON.parse(
      readFileSync(
        join(referenceDirectory, "shaft-identity-supplement.v1.json"),
        "utf8"
      )
    );
    return validateShaftIdentitySupplement(parsed, frozenShafts);
  } catch {
    return { ok: false, reason: "SUPPLEMENT_UNAVAILABLE", identities: [] };
  }
}

// lib/match/intelligence/load.ts
function parseTable(raw) {
  if (!Array.isArray(raw) || raw.length < 2 || !Array.isArray(raw[0])) {
    throw new Error("Frozen catalogue must be [header, ...rows]");
  }
  const cols = raw[0];
  return raw.slice(1).map((row) => {
    const r = row;
    const obj = {};
    for (let i = 0; i < cols.length; i++) {
      obj[cols[i]] = r[i] === void 0 ? null : r[i];
    }
    return obj;
  });
}
function isEligibleHead(h) {
  return h.intelligence_version === "DRIVER_V1" && String(h.match_eligible).toUpperCase() === "TRUE" && String(h.driver_subtype || "").toUpperCase() === "STANDARD" && String(h.category || "").toUpperCase() === "DRIVER" && String(h.rules_conformity || "").toUpperCase() !== "NON_CONFORMING";
}
function loadMatchIntelligence(referenceDirectory) {
  const headsRaw = JSON.parse(
    readFileSync2(join2(referenceDirectory, "heads.json"), "utf8")
  );
  const shaftsRaw = JSON.parse(
    readFileSync2(join2(referenceDirectory, "shafts.json"), "utf8")
  );
  const frozenHeads = parseTable(headsRaw).map(
    (h) => deepFreezeRecord(h)
  );
  const frozenShafts = parseTable(shaftsRaw).map(
    (s) => deepFreezeRecord(s)
  );
  const supplement = loadShaftIdentitySupplement(
    referenceDirectory,
    frozenShafts
  );
  const resolutionShafts = supplement.ok ? [
    ...frozenShafts,
    ...supplement.identities.map((row) => deepFreezeRecord(row))
  ] : frozenShafts;
  const headsByKey = {};
  for (const h of frozenHeads) {
    const key = h.catalogue_key;
    if (typeof key === "string" && key) headsByKey[key] = h;
  }
  const shaftsByKey = {};
  for (const s of resolutionShafts) {
    const key = s.shaft_key;
    if (typeof key === "string" && key) shaftsByKey[key] = s;
  }
  const eligibleHeads = frozenHeads.filter(isEligibleHead);
  const matchEligibleShafts = frozenShafts.filter(
    (s) => s.match_eligibility === "MATCH_ELIGIBLE" && !!s.shaft_key
  );
  const brandRegistry = buildBrandRegistry(frozenHeads);
  return Object.freeze({
    heads: Object.freeze(frozenHeads),
    shafts: Object.freeze(resolutionShafts),
    headsByKey: Object.freeze(headsByKey),
    shaftsByKey: Object.freeze(shaftsByKey),
    eligibleHeads: Object.freeze(eligibleHeads),
    matchEligibleShafts: Object.freeze(matchEligibleShafts),
    brandRegistry
  });
}
function canonicalHeadBrandId(head) {
  const brand = head?.brand ?? head?.Brand;
  if (typeof brand !== "string") return void 0;
  return canonicalBrandId(brand) ?? void 0;
}

// lib/match/scoring/dim-helpers.ts
function inactiveDim(name, reason) {
  return {
    active: false,
    nominal_weight: DIMENSION_WEIGHTS[name],
    reliability: 0,
    score: null,
    omission_reason: reason
  };
}
function activeDim(name, reliability, score) {
  return {
    active: true,
    nominal_weight: DIMENSION_WEIGHTS[name],
    reliability,
    score
  };
}
function numField(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// lib/match/scoring/head-dimensions.ts
function scoreHeadCharacteristicDimensions(req, head) {
  const dims = {};
  const gaps = {
    direction: null,
    head_launch: null
  };
  for (const [name, reqVal, headField, confField] of [
    ["forgiveness", req.forgiveness_requirement, "forgiveness", "forgiveness_confidence"],
    ["stability", req.stability_requirement, "stability", "stability_confidence"],
    ["workability", req.workability_preference, "workability", "workability_confidence"]
  ]) {
    const eq = numField(head[headField]);
    const rel = evidenceReliability(String(head[confField] || ""));
    if (reqVal == null || eq == null || rel <= 0) {
      dims[name] = inactiveDim(
        name,
        reqVal == null ? "REQUIREMENT_UNRESOLVED" : "EQUIPMENT_EVIDENCE_UNRESOLVED"
      );
    } else {
      const gap = Math.max(0, reqVal - eq);
      dims[name] = activeDim(name, rel, scoreMinimumNeed(gap));
    }
  }
  if (req.directional_target_numeric == null) {
    dims.direction = inactiveDim("direction", "REQUIREMENT_UNRESOLVED");
  } else {
    const bias = directionBiasToNumeric(String(head.directional_bias || ""));
    const rel = evidenceReliability(String(head.directional_bias_confidence || ""));
    if (bias == null || rel <= 0) {
      dims.direction = inactiveDim("direction", "EQUIPMENT_EVIDENCE_UNRESOLVED");
    } else {
      const gap = Math.abs(bias - req.directional_target_numeric);
      gaps.direction = gap;
      dims.direction = activeDim("direction", rel, scoreDirection(gap));
    }
  }
  if (req.head_launch_target === "UNRESOLVED" || req.head_launch_target_numeric == null) {
    dims.head_launch = inactiveDim("head_launch", "REQUIREMENT_UNRESOLVED");
  } else {
    const val = launchTendencyToNumeric(String(head.launch_tendency || ""));
    const rel = evidenceReliability(String(head.launch_confidence || ""));
    if (val == null || rel <= 0) {
      dims.head_launch = inactiveDim("head_launch", "EQUIPMENT_EVIDENCE_UNRESOLVED");
    } else {
      const gap = Math.abs(val - req.head_launch_target_numeric);
      gaps.head_launch = gap;
      dims.head_launch = activeDim("head_launch", rel, scoreLaunch(gap));
    }
  }
  dims.head_spin = inactiveDim("head_spin", "SPIN_INACTIVE_V1");
  return { dimensions: dims, gaps };
}

// lib/match/scoring/shaft-characteristics.ts
function inactive(name, reason) {
  return inactiveDim(name, reason);
}
function scoreShaftCharacteristicDimensions(req, shaft) {
  const considerations = [];
  const gaps = {
    flex: null,
    shaft_launch: null
  };
  let flex;
  if (req.shaft_flex_min_value == null || req.shaft_flex_max_value == null) {
    flex = inactive("flex", "REQUIREMENT_UNRESOLVED");
  } else if (shaft.match_flex_mapping_status !== "MAPPED") {
    flex = inactive("flex", "SHAFT_FLEX_UNMAPPED");
    considerations.push("SHAFT_FLEX_UNMAPPED");
  } else {
    const flexVal = numField(shaft.match_flex_value);
    if (flexVal == null) {
      flex = inactive("flex", "SHAFT_FLEX_UNMAPPED");
      considerations.push("SHAFT_FLEX_UNMAPPED");
    } else {
      const gap = rangeGap(
        flexVal,
        req.shaft_flex_min_value,
        req.shaft_flex_max_value
      );
      gaps.flex = gap;
      flex = activeDim("flex", 1, scoreFlex(gap));
    }
  }
  let weight;
  if (req.shaft_weight_min_g == null || req.shaft_weight_max_g == null) {
    weight = inactive("weight", "REQUIREMENT_UNRESOLVED");
  } else {
    const wt = numField(shaft.actual_weight_g);
    const wconf = String(shaft.match_weight_confidence || "");
    const weightReliability = evidenceReliability(wconf);
    if (wt == null || wconf === "UNRESOLVED" || wconf === "NOT_APPLICABLE" || weightReliability <= 0) {
      weight = inactive("weight", "SHAFT_WEIGHT_UNKNOWN");
      considerations.push("SHAFT_WEIGHT_UNKNOWN");
    } else {
      const gap = rangeGap(wt, req.shaft_weight_min_g, req.shaft_weight_max_g);
      weight = activeDim("weight", weightReliability, scoreWeight(gap));
    }
  }
  let shaft_launch;
  if (req.shaft_launch_target === "UNRESOLVED" || req.shaft_launch_target_numeric == null) {
    shaft_launch = inactive("shaft_launch", "REQUIREMENT_UNRESOLVED");
  } else if (shaft.match_launch_resolution_status !== "RESOLVED") {
    shaft_launch = inactive("shaft_launch", "SHAFT_LAUNCH_UNRESOLVED");
  } else {
    const val = launchTendencyToNumeric(String(shaft.launch_profile || ""));
    const rel = evidenceReliability(String(shaft.launch_confidence || ""));
    if (val == null || rel <= 0) {
      shaft_launch = inactive("shaft_launch", "SHAFT_LAUNCH_UNRESOLVED");
    } else {
      const gap = Math.abs(val - req.shaft_launch_target_numeric);
      gaps.shaft_launch = gap;
      shaft_launch = activeDim("shaft_launch", rel, scoreLaunch(gap));
    }
  }
  const shaft_spin = inactive("shaft_spin", "SPIN_INACTIVE_V1");
  return {
    dimensions: { flex, weight, shaft_launch, shaft_spin },
    gaps,
    considerations
  };
}

// lib/match/scoring/candidate.ts
function inactive2(name, reason) {
  return inactiveDim(name, reason);
}
function planListingLoft(head, stated) {
  const mode = String(head.hosel_loft_adjustment_type || "NONE").toUpperCase();
  const settingsRaw = head.hosel_loft_settings;
  let settings;
  if (typeof settingsRaw === "string" && settingsRaw.trim()) {
    settings = settingsRaw.split(/[|,]/).map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
  } else if (Array.isArray(settingsRaw)) {
    settings = settingsRaw.map(Number).filter((n) => Number.isFinite(n));
  }
  const structuredMin = numField(head.hosel_loft_setting_min_deg);
  const structuredMax = numField(head.hosel_loft_setting_max_deg);
  const legacyMin = numField(head.loft_adjustment_min_deg);
  const legacyMax = numField(head.loft_adjustment_max_deg);
  const hasStructured = settings != null && settings.length > 0 || structuredMin != null && structuredMax != null;
  const hasLegacy = legacyMin != null && legacyMax != null;
  let min;
  let max;
  let usedLegacyDelta = false;
  if (mode === "DELTA_RANGE") {
    if (hasStructured) {
      min = structuredMin ?? void 0;
      max = structuredMax ?? void 0;
    } else if (hasLegacy) {
      min = legacyMin;
      max = legacyMax;
      usedLegacyDelta = true;
    }
  } else if (mode === "PUBLISHED_SETTINGS") {
    min = structuredMin ?? void 0;
    max = structuredMax ?? void 0;
  }
  return { mode, stated, min, max, settings, usedLegacyDelta };
}
function scoreCandidate(input) {
  const { listing, requirements: req, head, shaft, golferConfidence } = input;
  const considerations = new Set(req.conflict_flags);
  const listingDeductions = [];
  if (!listing.publicly_purchasable) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["NOT_PURCHASABLE"]
    };
  }
  if (!head) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["UNRESOLVED_HEAD_IDENTITY"]
    };
  }
  if (head.intelligence_version !== "DRIVER_V1" || String(head.match_eligible).toUpperCase() !== "TRUE" || String(head.driver_subtype || "").toUpperCase() !== "STANDARD" || String(head.rules_conformity || "").toUpperCase() === "NON_CONFORMING") {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["HEAD_NOT_MATCH_ELIGIBLE"]
    };
  }
  if (listing.shaft_key == null) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["UNRESOLVED_SHAFT_IDENTITY"]
    };
  }
  if (!shaft || shaft.match_eligibility !== "MATCH_ELIGIBLE") {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["SHAFT_NOT_MATCH_ELIGIBLE"]
    };
  }
  if (String(listing.handedness).toUpperCase() !== String(req.handedness).toUpperCase()) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["HANDEDNESS_MISMATCH"]
    };
  }
  if (listing.stated_loft_deg == null || !Number.isFinite(listing.stated_loft_deg)) {
    return {
      listing_id: listing.listing_id,
      excluded: true,
      exclusion_reasons: ["UNUSABLE_LOFT"]
    };
  }
  const headChars = scoreHeadCharacteristicDimensions(req, head);
  const dims = {
    ...headChars.dimensions
  };
  const gaps = {
    flex: null,
    loft: null,
    direction: headChars.gaps.direction,
    head_launch: headChars.gaps.head_launch,
    shaft_launch: null
  };
  let loftPlan = null;
  let statedOutsideActiveTarget = false;
  let adjustableIntoTarget = false;
  if (req.preferred_loft_min_deg == null || req.preferred_loft_max_deg == null) {
    dims.loft = inactive2("loft", "REQUIREMENT_UNRESOLVED");
  } else {
    loftPlan = planListingLoft(head, listing.stated_loft_deg);
    const reachable = loftReachable(loftPlan);
    const gap = rangeGap(
      reachable,
      req.preferred_loft_min_deg,
      req.preferred_loft_max_deg
    );
    gaps.loft = gap;
    dims.loft = activeDim("loft", 1, scoreLoft(gap));
    const statedGap = rangeGap(
      listing.stated_loft_deg,
      req.preferred_loft_min_deg,
      req.preferred_loft_max_deg
    );
    statedOutsideActiveTarget = statedGap > 0;
    if (gap === 0 && loftPlan.mode === "DELTA_RANGE" && statedOutsideActiveTarget) {
      adjustableIntoTarget = true;
      considerations.add("LOFT_ADJUSTABLE_INTO_TARGET");
    }
  }
  const shaftChars = scoreShaftCharacteristicDimensions(req, shaft);
  dims.flex = shaftChars.dimensions.flex;
  dims.weight = shaftChars.dimensions.weight;
  dims.shaft_launch = shaftChars.dimensions.shaft_launch;
  dims.shaft_spin = shaftChars.dimensions.shaft_spin;
  gaps.flex = shaftChars.gaps.flex;
  gaps.shaft_launch = shaftChars.gaps.shaft_launch;
  for (const code of shaftChars.considerations) {
    considerations.add(code);
  }
  for (const name of DIMENSION_NAMES) {
    if (!dims[name]) dims[name] = inactive2(name, "INTERNAL_MISSING");
  }
  const agg = aggregateFit(
    DIMENSION_NAMES.filter((n) => dims[n].active).map((n) => ({
      weight: dims[n].nominal_weight,
      reliability: dims[n].reliability,
      score: dims[n].score
    }))
  );
  if (!agg.scorable) {
    return {
      listing_id: listing.listing_id,
      excluded: false,
      raw_fit_score: null,
      match_band: null,
      suppressed: true,
      dimensions: dims,
      guardrail_gaps: gaps,
      confidence_components: {
        golfer: golferConfidence,
        equipment: 0,
        listing: 0
      },
      confidence_score: null,
      confidence: null,
      considerations: sortedSetValues(considerations),
      listing_confidence_deductions: [],
      scorable: false
    };
  }
  const { suppressed, ceiling } = applyGuardrails({
    flex: gaps.flex,
    loft: gaps.loft,
    direction: gaps.direction,
    head_launch: gaps.head_launch,
    shaft_launch: gaps.shaft_launch
  });
  let band = matchBandFromScore(agg.score);
  if (ceiling && BAND_RANK[band] > BAND_RANK[ceiling]) {
    band = ceiling;
  }
  let eqNum = 0;
  let eqDen = 0;
  for (const n of DIMENSION_NAMES) {
    if (!dims[n].active) continue;
    eqNum += DIMENSION_WEIGHTS[n] * reliabilityToEquipmentPoints(dims[n].reliability);
    eqDen += DIMENSION_WEIGHTS[n];
  }
  const equipment = eqDen > 0 ? eqNum / eqDen : 0;
  const deduct = (code, amount) => {
    if (listingDeductions.some((d) => d.code === code)) return;
    listingDeductions.push({ code, amount });
  };
  if (dims.flex.omission_reason === "SHAFT_FLEX_UNMAPPED" && req.shaft_flex_min_value != null) {
    deduct("LISTING_FLEX_UNMAPPED", 10);
  }
  if (dims.weight.omission_reason === "SHAFT_WEIGHT_UNKNOWN" && req.shaft_weight_min_g != null) {
    deduct("LISTING_WEIGHT_UNAVAILABLE", 5);
  }
  if (!dims.shaft_launch.active && req.shaft_launch_target !== "UNRESOLVED" && req.shaft_launch_target_numeric != null) {
    deduct("LISTING_SHAFT_LAUNCH_UNAVAILABLE", 5);
  }
  if (loftPlan?.usedLegacyDelta && adjustableIntoTarget && req.preferred_loft_min_deg != null) {
    deduct("LISTING_LEGACY_LOFT_DELTA", 5);
    considerations.add("LISTING_LEGACY_LOFT_DELTA");
  }
  if (loftPlan?.mode === "UNKNOWN" && statedOutsideActiveTarget && req.preferred_loft_min_deg != null) {
    deduct("LISTING_UNKNOWN_HOSEL_RANGE", 5);
    considerations.add("LISTING_UNKNOWN_HOSEL_RANGE");
  }
  for (const name of [
    "forgiveness",
    "stability",
    "direction",
    "head_launch",
    "workability"
  ]) {
    const reqActive = name === "forgiveness" && req.forgiveness_requirement != null || name === "stability" && req.stability_requirement != null || name === "workability" && req.workability_preference != null || name === "direction" && req.directional_target_numeric != null || name === "head_launch" && req.head_launch_target_numeric != null;
    if (reqActive && !dims[name].active && dims[name].omission_reason === "EQUIPMENT_EVIDENCE_UNRESOLVED") {
      deduct(`LISTING_HEAD_${name.toUpperCase()}_UNAVAILABLE`, 5);
    }
  }
  const listingConf = Math.max(
    0,
    Math.min(
      100,
      100 - listingDeductions.reduce((sum, d) => sum + d.amount, 0)
    )
  );
  const overall = aggregateConfidence({
    golfer: golferConfidence,
    equipment,
    listing: listingConf
  });
  return {
    listing_id: listing.listing_id,
    excluded: false,
    raw_fit_score: agg.score,
    match_band: band,
    suppressed,
    dimensions: dims,
    guardrail_gaps: gaps,
    confidence_components: {
      golfer: golferConfidence,
      equipment,
      listing: listingConf
    },
    confidence_score: overall.score,
    confidence: overall.confidence,
    considerations: sortedSetValues(considerations),
    listing_confidence_deductions: listingDeductions,
    scorable: true
  };
}

// lib/match/pipeline.ts
var EMPTY_SLOTS = {
  BEST_MATCH: null,
  BEST_VALUE: null,
  BUDGET_OPTION: null
};
function runMatchSession(input) {
  const req = normalizeRequirements(
    input.raw_inputs,
    input.intelligence.headsByKey
  );
  const golfer = golferEvidenceConfidence(input.raw_inputs, req.conflict_flags);
  const sessionConsiderations = [];
  const speed = input.raw_inputs.club_speed_mph;
  const carry = input.raw_inputs.carry_distance_yards;
  const hasSpeed = speed != null && speed !== "" && Number.isFinite(Number(speed));
  const hasCarry = carry != null && carry !== "" && Number.isFinite(Number(carry));
  if (!hasSpeed && hasCarry) {
    sessionConsiderations.push("SWING_SPEED_INFERRED_FROM_CARRY");
  }
  if (!hasSpeed && !hasCarry) {
    sessionConsiderations.push("SWING_SPEED_UNKNOWN");
  }
  const candidates = input.inventory.map((listing) => {
    const scored = scoreCandidate({
      listing,
      requirements: req,
      head: input.intelligence.headsByKey[listing.head_key],
      shaft: listing.shaft_key ? input.intelligence.shaftsByKey[listing.shaft_key] : void 0,
      golferConfidence: golfer
    });
    if (!scored.excluded) {
      const merged2 = /* @__PURE__ */ new Set([
        ...scored.considerations || [],
        ...sessionConsiderations
      ]);
      scored.considerations = sortedSetValues(merged2);
    }
    return scored;
  });
  const market = [];
  for (const c of candidates) {
    if (c.excluded || c.raw_fit_score == null || !c.match_band || !c.confidence) {
      continue;
    }
    const listing = input.inventory.find((l) => l.listing_id === c.listing_id);
    const head = input.intelligence.headsByKey[listing.head_key];
    market.push({
      listing_id: c.listing_id,
      score: c.raw_fit_score,
      price_gbp: listing.price_gbp,
      band: c.match_band,
      confidence: c.confidence,
      confidence_score: c.confidence_score ?? void 0,
      suppressed: !!c.suppressed,
      publicly_purchasable: listing.publicly_purchasable,
      head_brand_id: canonicalHeadBrandId(head)
    });
  }
  const budget = input.raw_inputs.budget_max_gbp == null ? null : Number(input.raw_inputs.budget_max_gbp);
  const budgetNum = Number.isFinite(budget) ? budget : null;
  const registry = input.intelligence.brandRegistry;
  const selection = validateBrandSelection(
    input.marketplace_preferences?.brand_ids,
    registry
  );
  if (!selection.ok) {
    const merged2 = mergeLabels(EMPTY_SLOTS);
    return {
      normalised_requirements: req,
      candidates,
      presentation: {
        cards: [],
        empty_state: true,
        unfilled_slots: merged2.unfilled_slots,
        scope: "SELECTED_BRANDS",
        state: "INVALID_BRAND_SELECTION",
        show_all_brands_action: true
      },
      marketplace_preferences: {
        brand_ids: [],
        policy_version: MATCH_MARKETPLACE_BRAND_FILTER_VERSION
      },
      error: "INVALID_BRAND_SELECTION",
      versions: matchAdapterVersions()
    };
  }
  const brandResult = brandMarketplace({
    selected_brand_ids: selection.brand_ids,
    known_brand_ids: Array.from(registry.ids),
    candidates: market,
    budget: budgetNum
  });
  if ("error" in brandResult) {
    const merged2 = mergeLabels(EMPTY_SLOTS);
    return {
      normalised_requirements: req,
      candidates,
      presentation: {
        cards: [],
        empty_state: true,
        unfilled_slots: merged2.unfilled_slots,
        scope: "SELECTED_BRANDS",
        state: "INVALID_BRAND_SELECTION",
        show_all_brands_action: true
      },
      marketplace_preferences: {
        brand_ids: [],
        policy_version: MATCH_MARKETPLACE_BRAND_FILTER_VERSION
      },
      error: "INVALID_BRAND_SELECTION",
      versions: matchAdapterVersions()
    };
  }
  const merged = mergeLabels(brandResult.slots);
  return {
    normalised_requirements: req,
    candidates,
    presentation: {
      cards: merged.cards,
      empty_state: brandResult.state !== "RESULTS" || merged.cards.length === 0,
      unfilled_slots: merged.unfilled_slots,
      scope: brandResult.scope,
      state: brandResult.state,
      show_all_brands_action: brandResult.show_all_brands_action
    },
    marketplace_preferences: {
      brand_ids: brandResult.selected_brand_ids,
      policy_version: MATCH_MARKETPLACE_BRAND_FILTER_VERSION
    },
    versions: matchAdapterVersions()
  };
}

// lib/shippo.ts
var SHIPPO_API_TOKEN = process.env.SHIPPO_API_TOKEN;
var SHIPPO_DPD_CARRIER_ACCOUNT_IDS = process.env.SHIPPO_DPD_CARRIER_ACCOUNT_ID ? process.env.SHIPPO_DPD_CARRIER_ACCOUNT_ID.split(",").map((s) => s.trim()).filter(Boolean) : null;
var ShippingService = {
  DPD_NEXT_DAY: "DPD_NEXT_DAY",
  DPD_SHIP_TO_SHOP: "DPD_SHIP_TO_SHOP"
};
var ALLOWLISTED_SERVICELEVEL_TOKENS = {
  [ShippingService.DPD_NEXT_DAY]: [
    "dpd_uk_next_day",
    "dpd_uk_door_to_door_next_day",
    "dpd_uk_nextday"
  ],
  [ShippingService.DPD_SHIP_TO_SHOP]: [
    "dpd_uk_ship_to_shop",
    "dpd_uk_pickup",
    "dpd_uk_parcelshop"
  ]
};
var ParcelPreset = {
  GOLF_DRIVER: "GOLF_DRIVER",
  IRON_SET: "IRON_SET",
  PUTTER: "PUTTER",
  SMALL_ITEM: "SMALL_ITEM"
};
var PARCEL_PRESET_DIMENSIONS = {
  [ParcelPreset.GOLF_DRIVER]: { length_cm: 120, width_cm: 20, height_cm: 15, weight_kg: 2.5 },
  [ParcelPreset.IRON_SET]: { length_cm: 105, width_cm: 30, height_cm: 20, weight_kg: 6.5 },
  [ParcelPreset.PUTTER]: { length_cm: 95, width_cm: 20, height_cm: 15, weight_kg: 2 },
  [ParcelPreset.SMALL_ITEM]: { length_cm: 50, width_cm: 30, height_cm: 15, weight_kg: 2 }
};
function getParcelForPreset(preset) {
  const valid = Object.values(ParcelPreset);
  const key = preset && valid.includes(preset) ? preset : ParcelPreset.SMALL_ITEM;
  const d = PARCEL_PRESET_DIMENSIONS[key];
  return {
    length: String(d.length_cm),
    width: String(d.width_cm),
    height: String(d.height_cm),
    distanceUnit: "cm",
    weight: String(d.weight_kg),
    massUnit: "kg"
  };
}
var DEFAULT_PARCEL = getParcelForPreset(ParcelPreset.SMALL_ITEM);

// scripts/teevo-match-test-adapter.ts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
function runProbe(stage, inputs, intelligence) {
  switch (stage) {
    case "band":
      return { band: matchBandFromScore(Number(inputs.score)) };
    case "confidence_band":
      return { confidence: confidenceFromScore(Number(inputs.score)) };
    case "dimension":
      return {
        score: scoreDimensionCurve(
          inputs.dimension,
          Number(inputs.gap)
        )
      };
    case "aggregate": {
      const dims = inputs.dimensions || [];
      const result = aggregateFit(dims);
      if (!result.scorable) {
        return {
          score: null,
          scorable: false,
          reason: result.reason
        };
      }
      return { score: result.score };
    }
    case "guardrail":
      return guardrailForGap(
        inputs.dimension,
        Number(inputs.gap)
      );
    case "loft":
      return {
        reachable: loftReachable({
          mode: String(inputs.mode),
          stated: Number(inputs.stated),
          min: inputs.min != null ? Number(inputs.min) : void 0,
          max: inputs.max != null ? Number(inputs.max) : void 0,
          settings: inputs.settings
        })
      };
    case "marketplace": {
      const { slots, unique_cards } = selectMarketplaceSlots(
        inputs.candidates,
        inputs.budget ?? null
      );
      return { slots, unique_cards };
    }
    case "brand_marketplace":
      return brandMarketplace({
        selected_brand_ids: inputs.selected_brand_ids,
        known_brand_ids: inputs.known_brand_ids,
        candidates: inputs.candidates,
        budget: inputs.budget ?? null
      });
    case "eligibility":
      return {
        eligible: isMatchEligible(
          inputs
        )
      };
    case "parse_number":
      return parseNumber(inputs.raw);
    case "target_category":
      return targetCategories(
        inputs.value === null || inputs.value === void 0 ? null : Number(inputs.value)
      );
    case "speed_region":
      return speedRegion(Number(inputs.speed));
    case "carry_region":
      return carryRegion(Number(inputs.carry));
    case "requirements":
      return {
        normalised_requirements: normalizeRequirements(
          inputs.raw_inputs,
          intelligence.headsByKey
        )
      };
    case "confidence_aggregate":
      return aggregateConfidence({
        golfer: Number(inputs.golfer),
        equipment: Number(inputs.equipment),
        listing: Number(inputs.listing)
      });
    case "merge_labels":
      return mergeLabels(
        inputs.slots
      );
    case "money_saving":
      return {
        qualifies: moneySavingQualifies(
          Number(inputs.best_price_pence),
          Number(inputs.candidate_price_pence)
        )
      };
    case "identity_resolution":
      return resolveIdentity(
        inputs.matches
      );
    default:
      throw new Error(`Unknown probe stage: ${stage}`);
  }
}
async function main() {
  const payload = JSON.parse(await readStdin());
  const intelligence = loadMatchIntelligence(payload.reference_directory);
  const archetypes = {};
  for (const arch of payload.archetypes) {
    archetypes[arch.id] = runMatchSession({
      raw_inputs: arch.raw_inputs,
      inventory: arch.inventory,
      intelligence
    });
  }
  const probes = {};
  for (const probe of payload.probes) {
    probes[probe.id] = runProbe(probe.stage, probe.inputs, intelligence);
  }
  process.stdout.write(JSON.stringify({ archetypes, probes }));
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
