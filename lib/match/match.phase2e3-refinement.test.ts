import { describe, expect, it } from "vitest";
import path from "path";
import {
  applyRefinementAnswer,
  commitRefinementProgress,
  EMPTY_REFINEMENT_STATE,
  isInformativeRefinementAnswer,
  loadMatchIntelligence,
  mergeOfferedKey,
  preferFresherRefineState,
  runCatalogueRecommendation,
  selectOptionalPostRecoveryQuestion,
  selectRefinement,
  type MatchRefinementState,
} from "@/lib/match";
import { PROFILE_FIXTURES } from "../../scripts/match-profile-checkpoint";

const REFERENCE = path.join(
  process.cwd(),
  "docs/teevo-match/driver-match-v1.1/reference"
);

function run(answers: Record<string, unknown>) {
  const intel = loadMatchIntelligence(REFERENCE);
  return runCatalogueRecommendation({
    answers,
    intelligence: intel,
    inventory: [],
  });
}

describe("Phase 2E.3 refinement policy", () => {
  it("Pathway A: named profiles get no refinement question", () => {
    const result = run(PROFILE_FIXTURES.beginner_forgiveness);
    expect(result.mode).toBe("NAMED_HEADS");
    const d = selectRefinement(result, PROFILE_FIXTURES.beginner_forgiveness, [], 0);
    expect(d.pathway).toBe("A");
    expect(d.question).toBeNull();
  });

  it("Pathway C: handedness-only → minimum intake", () => {
    const result = run(PROFILE_FIXTURES.sparse_handedness_only);
    expect(result.mode).toBe("CHARACTERISTIC_GUIDANCE");
    expect(result.audit.insufficient_evidence_reason).toBe(
      "INSUFFICIENT_EVIDENCE_BACKED_REQUIREMENT_DIMS"
    );
    const d = selectRefinement(
      result,
      PROFILE_FIXTURES.sparse_handedness_only,
      [],
      0
    );
    expect(d.pathway).toBe("C");
  });

  it("mid_handicap_distance: STRAIGHT preserved — ask start_direction first", () => {
    const base = PROFILE_FIXTURES.mid_handicap_distance;
    const result = run(base);
    expect(result.mode).toBe("CHARACTERISTIC_GUIDANCE");
    const d = selectRefinement(result, base, [], 0);
    expect(d.pathway).toBe("B");
    expect(d.question?.id).toBe("typical_start_direction");
  });

  it("mid_handicap: informative start recovers named without changing STRAIGHT", () => {
    const after: Record<string, unknown> = {
      ...PROFILE_FIXTURES.mid_handicap_distance,
      typical_start_direction: "RIGHT",
    };
    expect(after.typical_curvature).toBe("STRAIGHT");
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(
      result.recommendations.every((r) => r.active_catalogue_dim_count >= 4)
    ).toBe(true);
  });

  it("mid_handicap recovery does not open optional refine when traj already resolved", () => {
    const after = {
      ...PROFILE_FIXTURES.mid_handicap_distance,
      typical_start_direction: "RIGHT",
    };
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
    const d = selectRefinement(result, after, ["typical_start_direction"], 1, {
      recoveredNamedViaRefinement: true,
    });
    expect(d.pathway).toBe("A");
  });

  it("mid_handicap: KEEP-equivalent — STRAIGHT retained via applyRefinementAnswer", () => {
    const base = { ...PROFILE_FIXTURES.mid_handicap_distance };
    const applied = applyRefinementAnswer(
      base,
      "typical_curvature_straight_optional",
      "KEEP"
    );
    expect(applied.changed).toBe(false);
    expect(applied.answers.typical_curvature).toBe("STRAIGHT");
  });

  it("inconsistent_strike: VARIABLE clarify first; retain VARIABLE", () => {
    const base = PROFILE_FIXTURES.inconsistent_strike;
    const result = run(base);
    const d = selectRefinement(result, base, [], 0);
    expect(d.pathway).toBe("B");
    expect(d.question?.id).toBe("typical_curvature_variable_clarify");

    const kept = applyRefinementAnswer(
      base,
      "typical_curvature_variable_clarify",
      "VARIABLE"
    );
    expect(kept.changed).toBe(false);
    expect(kept.answers.typical_curvature).toBe("VARIABLE");

    const next = selectRefinement(result, base, [
      "typical_curvature_variable_clarify",
    ], 1);
    expect(next.pathway).toBe("NONE");
    expect(next.question).toBeNull();
  });

  it("inconsistent_strike: curve-only weak named → OPTIONAL_B trajectory", () => {
    const after = {
      ...PROFILE_FIXTURES.inconsistent_strike,
      typical_curvature: "RIGHT",
    };
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
    expect(
      result.recommendations.some((r) => r.active_catalogue_dim_count < 5)
    ).toBe(true);

    const withoutFlag = selectRefinement(
      result,
      after,
      ["typical_curvature_variable_clarify"],
      1
    );
    expect(withoutFlag.pathway).toBe("A");

    const withFlag = selectRefinement(
      result,
      after,
      ["typical_curvature_variable_clarify"],
      1,
      { recoveredNamedViaRefinement: true }
    );
    expect(withFlag.pathway).toBe("A");
    expect(withFlag.question).toBeNull();

    const dismissed = selectRefinement(
      result,
      after,
      ["typical_curvature_variable_clarify"],
      1,
      {
        recoveredNamedViaRefinement: true,
        optionalRefineDismissed: true,
      }
    );
    expect(dismissed.pathway).toBe("A");
  });

  it("inconsistent_strike: two-step traj+curve recovers 5-dim named", () => {
    const after = {
      ...PROFILE_FIXTURES.inconsistent_strike,
      typical_trajectory: "MID",
      typical_curvature: "RIGHT",
    };
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
    expect(result.recommendations[0].active_catalogue_dim_count).toBe(5);
    const opt = selectOptionalPostRecoveryQuestion(
      result,
      after,
      ["typical_curvature_variable_clarify", "typical_trajectory"],
      2,
      { recoveredNamedViaRefinement: true }
    );
    expect(opt).toBeNull();
  });

  it("sparse_incomplete: does not re-ask an explicit I'm not sure", () => {
    const base = PROFILE_FIXTURES.sparse_incomplete;
    const result = run(base);
    const d1 = selectRefinement(result, base, [], 0);
    expect(d1.question?.id).not.toBe("typical_trajectory");
    expect(d1.question?.id).not.toBe("typical_curvature_unknown");

    const omittedCurve = { ...base, typical_trajectory: "MID", typical_curvature: "" };
    const r2 = run(omittedCurve);
    const d2 = selectRefinement(r2, omittedCurve, ["typical_trajectory"], 1);
    if (r2.mode === "NAMED_HEADS") {
      expect(d2.pathway).toBe("A");
    } else {
      expect(d2.question?.id).toBe("typical_curvature_unknown");
    }

    const withTraj = { ...base, typical_trajectory: "MID" };
    const withBoth = { ...withTraj, typical_curvature: "RIGHT" };
    const r3 = run(withBoth);
    expect(r3.mode).toBe("NAMED_HEADS");
    expect(r3.recommendations[0].active_catalogue_dim_count).toBe(5);
  });

  it("does not silently replace primary_objective without confirm path", () => {
    const base = PROFILE_FIXTURES.mid_handicap_distance;
    const result = run(base);
    const d = selectRefinement(result, base, [], 0);
    expect(d.question?.id).not.toBe("primary_objective_miss_confirm");
    expect(d.question?.requiresObjectiveConfirm ?? false).toBe(false);
  });

  it("miss-reduction question only after ball-flight exhausted; apply needs explicit value", () => {
    const base = PROFILE_FIXTURES.mid_handicap_distance;
    const result = run(base);
    const d = selectRefinement(
      result,
      base,
      [
        "typical_start_direction",
        "typical_curvature_straight_optional",
      ],
      1
    );
    expect(d.pathway).toBe("B");
    expect(d.question?.id).toBe("primary_objective_miss_confirm");
    expect(d.question?.requiresObjectiveConfirm).toBe(true);

    const applied = applyRefinementAnswer(
      base,
      "primary_objective_miss_confirm",
      "REDUCE_RIGHT_MISS"
    );
    expect(applied.changed).toBe(true);
    expect(applied.answers.primary_objective).toBe("REDUCE_RIGHT_MISS");
    expect(base.primary_objective).toBe("DISTANCE");
  });

  it("UNKNOWN answer is not informative", () => {
    expect(
      isInformativeRefinementAnswer("typical_trajectory", "UNKNOWN")
    ).toBe(false);
    expect(
      isInformativeRefinementAnswer("typical_start_direction", "RIGHT")
    ).toBe(true);
  });

  it("max two Pathway B steps then NONE", () => {
    const base = PROFILE_FIXTURES.mid_handicap_distance;
    const result = run(base);
    const d = selectRefinement(result, base, ["a", "b"], 2);
    expect(d.pathway).toBe("NONE");
  });

  it("optional refine respects two-step max", () => {
    const after = {
      ...PROFILE_FIXTURES.inconsistent_strike,
      typical_curvature: "RIGHT",
    };
    const result = run(after);
    const d = selectRefinement(result, after, ["q1", "q2"], 2, {
      recoveredNamedViaRefinement: true,
    });
    expect(d.pathway).toBe("A");
  });

  it("mid_handicap_carry_hint mirrors distance start_direction offer", () => {
    const base = PROFILE_FIXTURES.mid_handicap_carry_hint;
    const result = run(base);
    const d = selectRefinement(result, base, [], 0);
    expect(d.pathway).toBe("B");
    expect(d.question?.id).toBe("typical_start_direction");
  });

  it("all 24 fixtures: initially named stay Pathway A; guidance get B or C", () => {
    const rows = Object.entries(PROFILE_FIXTURES).map(([id, answers]) => {
      const result = run(answers);
      const d = selectRefinement(result, answers, [], 0);
      return { id, mode: result.mode, pathway: d.pathway };
    });
    const named = rows.filter((r) => r.mode === "NAMED_HEADS");
    const guidance = rows.filter((r) => r.mode === "CHARACTERISTIC_GUIDANCE");
    expect(named.length).toBe(19);
    expect(guidance.length).toBe(5);
    for (const r of named) {
      expect(r.pathway).toBe("A");
    }
    for (const r of guidance) {
      if (r.pathway === "NONE") {
        const answers = PROFILE_FIXTURES[r.id as keyof typeof PROFILE_FIXTURES];
        expect(answers.typical_trajectory).toBe("UNKNOWN");
        expect(answers.typical_curvature).toBe("UNKNOWN");
      } else {
        expect(["B", "C"]).toContain(r.pathway);
      }
    }
    const handed = rows.find((r) => r.id === "sparse_handedness_only");
    expect(handed?.pathway).toBe("C");
  });

  it("Pathway C intake with unknown speed/handicap can still recover with traj+curve", () => {
    const after = {
      handedness: "RIGHT",
      typical_trajectory: "MID",
      typical_curvature: "RIGHT",
      primary_objective: "FORGIVENESS",
      handicap: null,
      club_speed_mph: null,
    };
    const result = run(after);
    expect(["NAMED_HEADS", "CHARACTERISTIC_GUIDANCE"]).toContain(result.mode);
  });
});

describe("Phase 2E.3 refinement session accounting", () => {
  it("preferFresherRefineState does not let stale offer regress stepCount", () => {
    const stale: MatchRefinementState = {
      ...EMPTY_REFINEMENT_STATE,
      stepCount: 0,
      askedQuestionIds: [],
      offeredKeys: ["old"],
    };
    const fresh: MatchRefinementState = {
      ...EMPTY_REFINEMENT_STATE,
      stepCount: 1,
      askedQuestionIds: ["typical_trajectory"],
      offeredKeys: ["old", "B:typical_trajectory:1"],
      answersFingerprint: "{}",
    };
    const merged = preferFresherRefineState(stale, fresh);
    expect(merged.stepCount).toBe(1);
    expect(merged.askedQuestionIds).toContain("typical_trajectory");
  });

  it("mergeOfferedKey unions keys onto freshest state", () => {
    const react: MatchRefinementState = {
      ...EMPTY_REFINEMENT_STATE,
      stepCount: 0,
      offeredKeys: [],
    };
    const storage: MatchRefinementState = {
      ...EMPTY_REFINEMENT_STATE,
      stepCount: 1,
      askedQuestionIds: ["typical_trajectory"],
      offeredKeys: ["B:typical_trajectory:0"],
    };
    const next = mergeOfferedKey(react, storage, "B:typical_curvature_unknown:1");
    expect(next.stepCount).toBe(1);
    expect(next.askedQuestionIds).toEqual(["typical_trajectory"]);
    expect(next.offeredKeys).toContain("B:typical_curvature_unknown:1");
    expect(next.offeredKeys).toContain("B:typical_trajectory:0");
  });

  it("commitRefinementProgress consumes step only when requested and sets recovery flag", () => {
    const prev: MatchRefinementState = {
      ...EMPTY_REFINEMENT_STATE,
      stepCount: 0,
      askedQuestionIds: [],
      answersFingerprint: "a",
    };
    const committed = commitRefinementProgress({
      previous: prev,
      questionId: "typical_curvature_variable_clarify",
      answersFingerprint: "b",
      consumeStep: true,
      resultMode: "NAMED_HEADS",
    });
    expect(committed.stepCount).toBe(1);
    expect(committed.askedQuestionIds).toEqual([
      "typical_curvature_variable_clarify",
    ]);
    expect(committed.recoveredNamedViaRefinement).toBe(true);
    expect(committed.answersFingerprint).toBe("b");

    const noConsume = commitRefinementProgress({
      previous: prev,
      questionId: "typical_trajectory",
      answersFingerprint: "c",
      consumeStep: false,
      resultMode: null,
    });
    expect(noConsume.stepCount).toBe(0);
    expect(noConsume.recoveredNamedViaRefinement).toBe(false);
  });

  it("failed-request semantics: proposed answers do not mutate base until commit", () => {
    const base = { ...PROFILE_FIXTURES.inconsistent_strike };
    const applied = applyRefinementAnswer(
      base,
      "typical_curvature_variable_clarify",
      "RIGHT"
    );
    expect(applied.changed).toBe(true);
    expect(base.typical_curvature).toBe("VARIABLE");
    expect(applied.answers.typical_curvature).toBe("RIGHT");
    // Simulate failure: never call commitRefinementProgress / never write answers.
    expect(EMPTY_REFINEMENT_STATE.stepCount).toBe(0);
  });
});

describe("Phase 2E.3 five blocked-profile recovery matrix", () => {
  it("mid_handicap_distance recovers via start RIGHT", () => {
    const after: Record<string, unknown> = {
      ...PROFILE_FIXTURES.mid_handicap_distance,
      typical_start_direction: "RIGHT",
    };
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
    expect(after.typical_curvature).toBe("STRAIGHT");
    expect(after.primary_objective).toBe("DISTANCE");
  });

  it("mid_handicap_carry_hint recovers via start RIGHT", () => {
    const after = {
      ...PROFILE_FIXTURES.mid_handicap_carry_hint,
      typical_start_direction: "RIGHT",
    };
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
  });

  it("inconsistent_strike weak then optional traj path to 5-dim", () => {
    const weak = {
      ...PROFILE_FIXTURES.inconsistent_strike,
      typical_curvature: "RIGHT",
    };
    const weakResult = run(weak);
    expect(weakResult.mode).toBe("NAMED_HEADS");
    const opt = selectRefinement(
      weakResult,
      weak,
      ["typical_curvature_variable_clarify"],
      1,
      { recoveredNamedViaRefinement: true }
    );
    expect(opt.pathway).toBe("A");

    const strong = { ...weak, typical_trajectory: "MID" };
    const strongResult = run(strong);
    expect(strongResult.mode).toBe("NAMED_HEADS");
    expect(strongResult.recommendations[0].active_catalogue_dim_count).toBe(5);
  });

  it("sparse_incomplete recovers with MID + RIGHT", () => {
    const after = {
      ...PROFILE_FIXTURES.sparse_incomplete,
      typical_trajectory: "MID",
      typical_curvature: "RIGHT",
    };
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
    expect(result.recommendations[0].active_catalogue_dim_count).toBe(5);
  });

  it("sparse_handedness_only Pathway C then recovers with intake fields", () => {
    const base = PROFILE_FIXTURES.sparse_handedness_only;
    expect(selectRefinement(run(base), base, [], 0).pathway).toBe("C");
    const after = {
      handedness: "RIGHT",
      handicap: 18,
      club_speed_mph: 90,
      typical_trajectory: "MID",
      typical_curvature: "RIGHT",
    };
    const result = run(after);
    expect(result.mode).toBe("NAMED_HEADS");
    expect(result.recommendations[0].active_catalogue_dim_count).toBe(5);
  });
});
