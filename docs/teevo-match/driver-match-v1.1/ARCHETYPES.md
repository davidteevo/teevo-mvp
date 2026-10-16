# Driver Match V1.2 — 48 resolved archetypes

Contract V1.3; Rules V1.2. D01–D07 resolved in RULES_V1_2.md. All inventory here is synthetic. Expected outputs are specifications, not results from a production engine. Brand filtering is tested separately in the stage probes.

| Case | Scenario |
|---|---|
| A01 | Right handed push-slice |
| A02 | Right handed pull-fade |
| A03 | Right handed push-draw |
| A04 | Right handed pull-hook |
| A05 | Right handed straight push |
| A06 | Right handed small fade |
| A07 | Left handed push-slice |
| A08 | Left handed pull-fade |
| A09 | Left handed push-draw |
| A10 | Left handed pull-hook |
| A11 | Left handed straight push |
| A12 | Left handed small fade |
| A13 | Two-way curvature |
| A14 | Variable start with stable right curve |
| A15 | Direction objective contradicts observed slice |
| A16 | Direction and trajectory skipped |
| A17 | Measured 79 mph |
| A18 | Measured 80 mph |
| A19 | Measured 89 mph |
| A20 | Measured 90 mph |
| A21 | Measured 99 mph |
| A22 | Measured 100 mph |
| A23 | Measured 109 mph |
| A24 | Measured 110 mph |
| A25 | Slow speed inconsistent strike |
| A26 | Fast consistent golfer |
| A27 | Fast golfer still needs forgiveness |
| A28 | Low flight |
| A29 | High flight |
| A30 | Control objective |
| A31 | Low handicap inconsistent |
| A32 | High handicap consistent |
| A33 | Carry-only 230 yards |
| A34 | Measured speed overrides conflicting carry |
| A35 | No speed or carry |
| A36 | Current driver satisfaction HIGH |
| A37 | Current driver satisfaction MEDIUM |
| A38 | Current driver satisfaction LOW |
| A39 | Current driver unresolved despite satisfaction |
| A40 | Eligible proprietary unmapped shaft |
| A41 | Eligible shaft actual weight unknown |
| A42 | Shaft launch source conflict |
| A43 | Shaft identity cannot resolve |
| A44 | No qualifying inventory |
| A45 | Exactly one qualifying listing |
| A46 | Close fits at different prices |
| A47 | Best fit above preferred budget |
| A48 | Sparse low-confidence questionnaire |

## A01 — Right handed push-slice

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "RIGHT",
  "typical_curvature": "RIGHT",
  "miss_severity": "LARGE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.75,
  "stability_requirement": 4,
  "directional_target_numeric": 2,
  "directional_requirement": "STRONG_DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A02 — Right handed pull-fade

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "LEFT",
  "typical_curvature": "RIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": 1.0,
  "directional_requirement": "DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A03 — Right handed push-draw

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "RIGHT",
  "typical_curvature": "LEFT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": -1.0,
  "directional_requirement": "FADE_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A04 — Right handed pull-hook

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "LEFT",
  "typical_curvature": "LEFT",
  "miss_severity": "LARGE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.75,
  "stability_requirement": 4,
  "directional_target_numeric": -2,
  "directional_requirement": "STRONG_FADE_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A05 — Right handed straight push

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "RIGHT",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": 0.5,
  "directional_requirement": "DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A06 — Right handed small fade

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "RIGHT",
  "miss_severity": "SMALL",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.25,
  "stability_requirement": 3.25,
  "directional_target_numeric": 1.0050000000000001,
  "directional_requirement": "DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A07 — Left handed push-slice

Raw inputs:

```json
{
  "handedness": "LEFT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "LEFT",
  "typical_curvature": "LEFT",
  "miss_severity": "LARGE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "LEFT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.75,
  "stability_requirement": 4,
  "directional_target_numeric": 2,
  "directional_requirement": "STRONG_DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A08 — Left handed pull-fade

Raw inputs:

```json
{
  "handedness": "LEFT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "RIGHT",
  "typical_curvature": "LEFT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "LEFT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": 1.0,
  "directional_requirement": "DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A09 — Left handed push-draw

Raw inputs:

```json
{
  "handedness": "LEFT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "LEFT",
  "typical_curvature": "RIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "LEFT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": -1.0,
  "directional_requirement": "FADE_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A10 — Left handed pull-hook

Raw inputs:

```json
{
  "handedness": "LEFT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "RIGHT",
  "typical_curvature": "RIGHT",
  "miss_severity": "LARGE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "LEFT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.75,
  "stability_requirement": 4,
  "directional_target_numeric": -2,
  "directional_requirement": "STRONG_FADE_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A11 — Left handed straight push

Raw inputs:

```json
{
  "handedness": "LEFT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "LEFT",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "LEFT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": 0.5,
  "directional_requirement": "DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A12 — Left handed small fade

Raw inputs:

```json
{
  "handedness": "LEFT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "LEFT",
  "miss_severity": "SMALL",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "LEFT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.25,
  "stability_requirement": 3.25,
  "directional_target_numeric": 1.0050000000000001,
  "directional_requirement": "DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "LEFT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A13 — Two-way curvature

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "VARIABLE",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 4,
  "stability_requirement": 4.5,
  "directional_target_numeric": null,
  "directional_requirement": "UNRESOLVED",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [
    "TWO_WAY_MISS"
  ],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": [
        "TWO_WAY_MISS"
      ]
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 95. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: TWO_WAY_MISS

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A14 — Variable start with stable right curve

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "VARIABLE",
  "typical_curvature": "RIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": 1.5,
  "directional_requirement": "STRONG_DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [
    "DIRECTION_EVIDENCE_PARTIAL"
  ],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "LOW",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": [
        "DIRECTION_EVIDENCE_PARTIAL"
      ]
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 95. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: DIRECTION_EVIDENCE_PARTIAL

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A15 — Direction objective contradicts observed slice

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "RIGHT",
  "typical_curvature": "RIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "REDUCE_LEFT_MISS",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.5,
  "stability_requirement": 3.5,
  "directional_target_numeric": 1.25,
  "directional_requirement": "DRAW_ASSIST",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [
    "DIRECTION_INPUT_CONFLICT"
  ],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT",
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "LOW",
      "source_codes": [
        "BALL_FLIGHT",
        "PRIMARY_OBJECTIVE"
      ],
      "conflict_codes": [
        "DIRECTION_INPUT_CONFLICT"
      ]
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 90. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: DIRECTION_INPUT_CONFLICT

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A16 — Direction and trajectory skipped

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "UNKNOWN",
  "typical_start_direction": "UNKNOWN",
  "typical_curvature": "UNKNOWN",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "UNRESOLVED",
  "head_launch_target_numeric": null,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": null,
  "directional_requirement": "UNRESOLVED",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "UNRESOLVED",
  "shaft_launch_target_numeric": null,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 84. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A17 — Measured 79 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 79,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 10.5,
  "preferred_loft_max_deg": 12.5,
  "shaft_weight_min_g": 40,
  "shaft_weight_max_g": 55,
  "shaft_flex_min_value": 0,
  "shaft_flex_max_value": 2,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A18 — Measured 80 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 80,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 10.0,
  "preferred_loft_max_deg": 12.0,
  "shaft_weight_min_g": 45,
  "shaft_weight_max_g": 60,
  "shaft_flex_min_value": 1,
  "shaft_flex_max_value": 2.5,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A19 — Measured 89 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 89,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 10.0,
  "preferred_loft_max_deg": 12.0,
  "shaft_weight_min_g": 45,
  "shaft_weight_max_g": 60,
  "shaft_flex_min_value": 1,
  "shaft_flex_max_value": 2.5,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A20 — Measured 90 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 90,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A21 — Measured 99 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 99,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A22 — Measured 100 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 100,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 8.5,
  "preferred_loft_max_deg": 10.5,
  "shaft_weight_min_g": 55,
  "shaft_weight_max_g": 70,
  "shaft_flex_min_value": 2.5,
  "shaft_flex_max_value": 4,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A23 — Measured 109 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 109,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 8.5,
  "preferred_loft_max_deg": 10.5,
  "shaft_weight_min_g": 55,
  "shaft_weight_max_g": 70,
  "shaft_flex_min_value": 2.5,
  "shaft_flex_max_value": 4,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A24 — Measured 110 mph

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 110,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 8.0,
  "preferred_loft_max_deg": 10.5,
  "shaft_weight_min_g": 60,
  "shaft_weight_max_g": 75,
  "shaft_flex_min_value": 3,
  "shaft_flex_max_value": 5,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A25 — Slow speed inconsistent strike

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 75,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "VARIABLE",
  "strike_consistency": "LOW",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 4.5,
  "stability_requirement": 5,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 1.5,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 10.5,
  "preferred_loft_max_deg": 12.5,
  "shaft_weight_min_g": 40,
  "shaft_weight_max_g": 55,
  "shaft_flex_min_value": 0,
  "shaft_flex_max_value": 2,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY",
        "STRIKE_PATTERN"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY",
        "STRIKE_PATTERN"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A26 — Fast consistent golfer

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 115,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "HIGH",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 2.5,
  "stability_requirement": 2.5,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2.5,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 8.0,
  "preferred_loft_max_deg": 10.5,
  "shaft_weight_min_g": 60,
  "shaft_weight_max_g": 75,
  "shaft_flex_min_value": 3,
  "shaft_flex_max_value": 5,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A27 — Fast golfer still needs forgiveness

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 115,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "LOW",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "FORGIVENESS",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 5,
  "stability_requirement": 5,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 1,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 8.0,
  "preferred_loft_max_deg": 10.5,
  "shaft_weight_min_g": 60,
  "shaft_weight_max_g": 75,
  "shaft_flex_min_value": 3,
  "shaft_flex_max_value": 5,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "PRIMARY_OBJECTIVE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "PRIMARY_OBJECTIVE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "PRIMARY_OBJECTIVE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A28 — Low flight

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "LOW",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID_HIGH",
  "head_launch_target_numeric": 1,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.5,
  "preferred_loft_max_deg": 12.0,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID_HIGH",
  "shaft_launch_target_numeric": 0.5,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED",
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A29 — High flight

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "HIGH",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID_LOW",
  "head_launch_target_numeric": -1,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 8.5,
  "preferred_loft_max_deg": 11.0,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID_LOW",
  "shaft_launch_target_numeric": -0.5,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED",
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A30 — Control objective

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "CONTROL",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 2.75,
  "stability_requirement": 4,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 3.5,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "PRIMARY_OBJECTIVE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "PRIMARY_OBJECTIVE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "PRIMARY_OBJECTIVE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A31 — Low handicap inconsistent

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 3,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "LOW",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 4,
  "stability_requirement": 4.5,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2.0,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "HANDICAP",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A32 — High handicap consistent

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 35,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "HIGH",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3.25,
  "stability_requirement": 3.25,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2.0,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "HANDICAP",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "HANDICAP",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "HANDICAP",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A33 — Carry-only 230 yards

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": null,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": 230,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": null,
  "preferred_loft_max_deg": null,
  "shaft_weight_min_g": null,
  "shaft_weight_max_g": null,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "flex": {
      "band": "LOW",
      "source_codes": [
        "CARRY_PROXY"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 90. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: SWING_SPEED_INFERRED_FROM_CARRY

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A34 — Measured speed overrides conflicting carry

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": 290,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [
    "SPEED_CARRY_CONFLICT"
  ],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "MEDIUM",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": [
        "SPEED_CARRY_CONFLICT"
      ]
    },
    "flex": {
      "band": "MEDIUM",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": [
        "SPEED_CARRY_CONFLICT"
      ]
    },
    "weight": {
      "band": "MEDIUM",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": [
        "SPEED_CARRY_CONFLICT"
      ]
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 95. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: SPEED_CARRY_CONFLICT

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A35 — No speed or carry

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": null,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": null,
  "preferred_loft_max_deg": null,
  "shaft_weight_min_g": null,
  "shaft_weight_max_g": null,
  "shaft_flex_min_value": null,
  "shaft_flex_max_value": null,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "flex": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "weight": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 75. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: SWING_SPEED_UNKNOWN

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A36 — Current driver satisfaction HIGH

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": "adams|blue|2015",
  "current_loft_deg": 10.5,
  "current_shaft_key": "accra|fx-2-0-140|2018|40|m3",
  "current_flex_raw": "M3",
  "current_club_satisfaction": "HIGH",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "PRESERVE",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A37 — Current driver satisfaction MEDIUM

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": "adams|blue|2015",
  "current_loft_deg": 10.5,
  "current_shaft_key": "accra|fx-2-0-140|2018|40|m3",
  "current_flex_raw": "M3",
  "current_club_satisfaction": "MEDIUM",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "OPTIMISE",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A38 — Current driver satisfaction LOW

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": "adams|blue|2015",
  "current_loft_deg": 10.5,
  "current_shaft_key": "accra|fx-2-0-140|2018|40|m3",
  "current_flex_raw": "M3",
  "current_club_satisfaction": "LOW",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "CORRECT",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A39 — Current driver unresolved despite satisfaction

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "HIGH",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A40 — Eligible proprietary unmapped shaft

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: SHAFT_FLEX_UNMAPPED

Synthetic inventory:

```json
[
  {
    "listing_id": "unmapped",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|tour-z-rpg-400-462|2018|60|m4plus",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

Hand-worked candidate expectations:

```json
{
  "unmapped": {
    "raw_fit_score": 95.69182389937107,
    "match_band": "EXCELLENT_MATCH",
    "confidence": "HIGH",
    "suppressed": false
  }
}
```

## A41 — Eligible shaft actual weight unknown

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: SHAFT_WEIGHT_UNKNOWN

Synthetic inventory:

```json
[
  {
    "listing_id": "weight_unknown",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "aretera|ec1-gray|2024|65|4",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A42 — Shaft launch source conflict

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "launch_conflict",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "aldila|rogue-black-95-msi|2015|60|r",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A43 — Shaft identity cannot resolve

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "missing",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": null,
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

## A44 — No qualifying inventory

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[]
```

## A45 — Exactly one qualifying listing

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "only",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

Hand-worked candidate expectations:

```json
{
  "only": {
    "raw_fit_score": 96.1731843575419,
    "match_band": "EXCELLENT_MATCH",
    "confidence": "HIGH",
    "confidence_score": 99.23076923076923,
    "suppressed": false
  }
}
```

## A46 — Close fits at different prices

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "expensive",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 300,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "cheaper",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 220,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "cheapest",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 180,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

Hand-worked candidate expectations:

```json
{
  "expensive": {
    "raw_fit_score": 96.1731843575419,
    "match_band": "EXCELLENT_MATCH",
    "confidence": "HIGH",
    "confidence_score": 99.23076923076923,
    "suppressed": false
  },
  "cheaper": {
    "raw_fit_score": 96.1731843575419,
    "match_band": "EXCELLENT_MATCH",
    "confidence": "HIGH",
    "confidence_score": 99.23076923076923,
    "suppressed": false
  },
  "cheapest": {
    "raw_fit_score": 96.1731843575419,
    "match_band": "EXCELLENT_MATCH",
    "confidence": "HIGH",
    "confidence_score": 99.23076923076923,
    "suppressed": false
  }
}
```

## A47 — Best fit above preferred budget

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": 10,
  "club_speed_mph": 95,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "MID",
  "typical_start_direction": "CENTRE",
  "typical_curvature": "STRAIGHT",
  "miss_severity": "MODERATE",
  "strike_pattern": "CENTRE",
  "strike_consistency": "MEDIUM",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "DISTANCE",
  "budget_max_gbp": 50,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "HIGH"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "MID",
  "head_launch_target_numeric": 0,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": 0.0,
  "directional_requirement": "NEUTRAL",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": 9.0,
  "preferred_loft_max_deg": 11.5,
  "shaft_weight_min_g": 50,
  "shaft_weight_max_g": 65,
  "shaft_flex_min_value": 2,
  "shaft_flex_max_value": 3,
  "shaft_launch_target": "MID",
  "shaft_launch_target_numeric": 0.0,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "MEDIUM",
      "source_codes": [
        "BALL_FLIGHT"
      ],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "MEDIUM",
      "source_codes": [
        "BASELINE",
        "STRIKE_CONSISTENCY"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "flex": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "weight": {
      "band": "HIGH",
      "source_codes": [
        "MEASURED_SPEED"
      ],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "MEDIUM",
      "source_codes": [
        "TRAJECTORY"
      ],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 100. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "only",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

Hand-worked candidate expectations:

```json
{
  "only": {
    "raw_fit_score": 96.1731843575419,
    "match_band": "EXCELLENT_MATCH",
    "confidence": "HIGH",
    "confidence_score": 99.23076923076923,
    "suppressed": false
  }
}
```

## A48 — Sparse low-confidence questionnaire

Raw inputs:

```json
{
  "handedness": "RIGHT",
  "handicap": null,
  "club_speed_mph": null,
  "ball_speed_mph": null,
  "launch_angle_deg": null,
  "spin_rate_rpm": null,
  "attack_angle_deg": null,
  "carry_distance_yards": null,
  "typical_trajectory": "UNKNOWN",
  "typical_start_direction": "UNKNOWN",
  "typical_curvature": "UNKNOWN",
  "miss_severity": "UNKNOWN",
  "strike_pattern": "CENTRE",
  "strike_consistency": "UNKNOWN",
  "current_driver_key": null,
  "current_loft_deg": null,
  "current_shaft_key": null,
  "current_flex_raw": null,
  "current_club_satisfaction": "UNKNOWN",
  "primary_objective": "UNKNOWN",
  "budget_max_gbp": 250,
  "input_source": "QUESTIONNAIRE",
  "input_confidence": "LOW"
}
```

Expected full normalized requirements:

```json
{
  "handedness": "RIGHT",
  "recommendation_intent": "UNANCHORED",
  "head_launch_target": "UNRESOLVED",
  "head_launch_target_numeric": null,
  "head_spin_target": "UNRESOLVED",
  "forgiveness_requirement": 3,
  "stability_requirement": 3,
  "directional_target_numeric": null,
  "directional_requirement": "UNRESOLVED",
  "workability_preference": 2,
  "driver_subtype_allowed": "STANDARD",
  "preferred_loft_min_deg": null,
  "preferred_loft_max_deg": null,
  "shaft_weight_min_g": null,
  "shaft_weight_max_g": null,
  "shaft_flex_min_value": null,
  "shaft_flex_max_value": null,
  "shaft_launch_target": "UNRESOLVED",
  "shaft_launch_target_numeric": null,
  "shaft_spin_target": "UNRESOLVED",
  "shaft_torque_target_deg": null,
  "conflict_flags": [],
  "requirement_confidence": {
    "forgiveness": {
      "band": "LOW",
      "source_codes": [
        "BASELINE"
      ],
      "conflict_codes": []
    },
    "stability": {
      "band": "LOW",
      "source_codes": [
        "BASELINE"
      ],
      "conflict_codes": []
    },
    "direction": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "head_launch": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "head_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "workability": {
      "band": "LOW",
      "source_codes": [
        "BASELINE"
      ],
      "conflict_codes": []
    },
    "loft": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "flex": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "weight": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "shaft_launch": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    },
    "shaft_spin": {
      "band": "UNRESOLVED",
      "source_codes": [],
      "conflict_codes": []
    }
  }
}
```

Expected golfer evidence score: 28. Overall confidence still depends on equipment/listing evidence.

Guardrails: hard eligibility gates precede scoring. Apply flex/loft/direction suppression and ceilings and combined launch ceiling using numeric requirements. Optional missing data is omitted/reweighted.

Bands: 65/75/85 boundaries with guardrail ceilings; confidence independent at 60/80. No primary badges for LOW confidence. No active Fit denominator yields explicit unscorable output.

Presentation: apply D07 exact ranking and merged labels; price does not alter Fit; no qualifying stock means no purchase cards. Apply brand selection only downstream.

Required consideration codes: Only supported evidence codes.

Synthetic inventory:

```json
[
  {
    "listing_id": "neutral",
    "head_key": "adams|speedline-9064ls|2011",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "draw",
    "head_key": "adams|blue|2015",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "fade",
    "head_key": "bridgestone|tour-b-xd-7|2017",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "delta",
    "head_key": "adams|speedline-fast-12-ls|2012",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  },
  {
    "listing_id": "published",
    "head_key": "benross|evolution-r|2018",
    "shaft_key": "accra|fx-2-0-140|2018|40|m3",
    "handedness": "RIGHT",
    "stated_loft_deg": 10.5,
    "publicly_purchasable": true,
    "price_gbp": 200,
    "condition": "GOOD",
    "seller_trust": "STANDARD",
    "delivery_days": 3
  }
]
```

Hand-worked candidate expectations:

```json
{
  "neutral": {
    "raw_fit_score": 100,
    "match_band": "EXCELLENT_MATCH",
    "confidence": "MEDIUM",
    "confidence_score": 67.6,
    "suppressed": false
  }
}
```
