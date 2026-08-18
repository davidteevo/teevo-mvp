import { describe, expect, it } from "vitest";
import { buildOrderWorkflowTimeline } from "@/lib/admin-order-timeline";

describe("buildOrderWorkflowTimeline", () => {
  it("omits starter pack stages for seller-own packaging", () => {
    const timeline = buildOrderWorkflowTimeline({
      packaging_source: "SELLER_OWN",
      packaging_requested_at: "2026-08-18T10:00:00.000Z",
      packaging_status: "SUBMITTED",
      packaging_photos: ["a", "b", "c"],
      fulfilment_status: "PACKAGING_SUBMITTED",
      fulfilment_mode: "manual",
    });
    expect(timeline.stages.some((s) => s.id.startsWith("starter"))).toBe(false);
    expect(timeline.currentStageLabel).toBe("Packaging awaiting verification");
    expect(timeline.nextActionLabel).toMatch(/review packaging/i);
  });

  it("includes starter pack stages and asks admin to dispatch", () => {
    const timeline = buildOrderWorkflowTimeline({
      packaging_source: "TEEVO_STARTER_PACK",
      packaging_requested_at: "2026-08-18T10:00:00.000Z",
      starter_pack_dispatched_at: null,
      fulfilment_status: "PAID",
    });
    expect(timeline.stages.map((s) => s.id)).toContain("starter_requested");
    expect(timeline.currentStageLabel).toBe("Starter Pack awaiting dispatch");
    expect(timeline.nextActionLabel).toMatch(/Starter Pack/);
  });
});
