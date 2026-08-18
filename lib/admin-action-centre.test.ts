import { describe, expect, it } from "vitest";
import {
  AdminActionType,
  buildAdminActionItem,
  compareAdminActions,
  countAdminActions,
  emptyFilterMessage,
  filterAdminActions,
  formatAdminUserLabel,
  formatWaitingDuration,
  getActionUrgency,
  getPriorityBand,
  isAlreadyProcessedPayload,
  isPackagingAwaitingReview,
  labelActionRequiredSince,
  packagingActionRequiredSince,
  resolveNextAdminAction,
  sortAdminActions,
} from "@/lib/admin-action-centre";

const NOW = Date.parse("2026-08-18T12:00:00.000Z");

describe("formatWaitingDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatWaitingDuration("2026-08-18T11:46:00.000Z", NOW)).toBe("14m");
  });

  it("formats whole hours under a day", () => {
    expect(formatWaitingDuration("2026-08-18T10:00:00.000Z", NOW)).toBe("2h");
  });

  it("formats days and leftover hours", () => {
    expect(formatWaitingDuration("2026-08-17T08:00:00.000Z", NOW)).toBe("1d 4h");
  });
});

describe("getActionUrgency", () => {
  it("marks listing verification overdue after 24h", () => {
    const result = getActionUrgency(AdminActionType.VERIFY_LISTING, "2026-08-17T10:00:00.000Z", NOW);
    expect(result).toEqual({ urgency: "overdue", isOverdue: true, urgencyLabel: "Overdue" });
  });

  it("marks blocking actions approaching after 8h", () => {
    const result = getActionUrgency(
      AdminActionType.REVIEW_PACKAGING,
      "2026-08-18T03:00:00.000Z",
      NOW
    );
    expect(result).toEqual({ urgency: "approaching", isOverdue: false, urgencyLabel: "Due soon" });
  });

  it("keeps recent feedback as normal", () => {
    const result = getActionUrgency(
      AdminActionType.REVIEW_FEEDBACK,
      "2026-08-18T10:00:00.000Z",
      NOW
    );
    expect(result).toEqual({ urgency: "normal", isOverdue: false, urgencyLabel: "Normal" });
  });
});

describe("priority and sort", () => {
  it("puts overdue ahead of blocking work", () => {
    expect(getPriorityBand(AdminActionType.REVIEW_FEEDBACK, true)).toBe(1);
    expect(getPriorityBand(AdminActionType.CREATE_LABEL, false)).toBe(2);
    expect(getPriorityBand(AdminActionType.VERIFY_LISTING, false)).toBe(3);
    expect(getPriorityBand(AdminActionType.REVIEW_FEEDBACK, false)).toBe(4);
  });

  it("sorts by priority then oldest first", () => {
    const newerListing = buildAdminActionItem(
      {
        actionType: AdminActionType.VERIFY_LISTING,
        entityId: "l2",
        title: "Newer listing",
        userLabel: "Alex W.",
        actionRequiredSince: "2026-08-18T10:00:00.000Z",
      },
      NOW
    );
    const olderListing = buildAdminActionItem(
      {
        actionType: AdminActionType.VERIFY_LISTING,
        entityId: "l1",
        title: "Older listing",
        userLabel: "James R.",
        actionRequiredSince: "2026-08-18T08:00:00.000Z",
      },
      NOW
    );
    const packaging = buildAdminActionItem(
      {
        actionType: AdminActionType.REVIEW_PACKAGING,
        entityId: "t1",
        title: "Packaging",
        userLabel: "Tom B.",
        actionRequiredSince: "2026-08-18T11:00:00.000Z",
        orderId: "t1",
      },
      NOW
    );
    const overdueFeedback = buildAdminActionItem(
      {
        actionType: AdminActionType.REVIEW_FEEDBACK,
        entityId: "r1",
        title: "Old review",
        userLabel: "Mike S.",
        actionRequiredSince: "2026-08-15T12:00:00.000Z",
      },
      NOW
    );

    const sorted = sortAdminActions([newerListing, packaging, olderListing, overdueFeedback]);
    expect(sorted.map((i) => i.entityId)).toEqual(["r1", "t1", "l1", "l2"]);
    expect(compareAdminActions(overdueFeedback, packaging)).toBeLessThan(0);
  });
});

describe("buildAdminActionItem", () => {
  it("appends overdue to the waiting label and uses human action text", () => {
    const item = buildAdminActionItem(
      {
        actionType: AdminActionType.VERIFY_LISTING,
        entityId: "abc",
        title: "TaylorMade Qi10 Driver",
        userLabel: "James R.",
        actionRequiredSince: "2026-08-16T12:00:00.000Z",
        badge: "Changes requested",
      },
      NOW
    );
    expect(item.waitingLabel).toContain("— Overdue");
    expect(item.waitingLabel.startsWith("2d")).toBe(true);
    expect(item.primaryActionLabel).toBe("Review");
    expect(item.specialistHref).toBe("/admin/listings/abc");
    expect(item.badge).toBe("Changes requested");
  });
});

describe("filters and counts", () => {
  it("filters and counts by action type", () => {
    const items = [
      buildAdminActionItem(
        {
          actionType: AdminActionType.VERIFY_LISTING,
          entityId: "l1",
          title: "A",
          userLabel: "A",
          actionRequiredSince: "2026-08-18T11:00:00.000Z",
        },
        NOW
      ),
      buildAdminActionItem(
        {
          actionType: AdminActionType.REVIEW_PACKAGING,
          entityId: "t1",
          title: "B",
          userLabel: "B",
          actionRequiredSince: "2026-08-18T11:00:00.000Z",
        },
        NOW
      ),
    ];
    expect(filterAdminActions(items, "packaging")).toHaveLength(1);
    expect(countAdminActions(items)).toMatchObject({ all: 2, listings: 1, packaging: 1, feedback: 0 });
    expect(emptyFilterMessage("packaging")).toMatch(/packaging/i);
  });
});

describe("resolveNextAdminAction", () => {
  it("maps pending listings to verify listing", () => {
    expect(resolveNextAdminAction({ listingStatus: "pending" })).toBe("VERIFY_LISTING");
  });

  it("maps starter packs that have not been dispatched", () => {
    expect(
      resolveNextAdminAction({
        packagingSource: "TEEVO_STARTER_PACK",
        starterPackDispatchedAt: null,
      })
    ).toBe("DISPATCH_STARTER_PACK");
  });

  it("maps submitted packaging photos to review packaging", () => {
    expect(
      resolveNextAdminAction({
        packagingStatus: "SUBMITTED",
        packagingPhotoCount: 4,
      })
    ).toBe("REVIEW_PACKAGING");
  });

  it("maps manual verified packaging without a label to create label", () => {
    expect(
      resolveNextAdminAction({
        fulfilmentMode: "manual",
        fulfilmentStatus: "PACKAGING_VERIFIED",
        shippingLabelUrl: null,
      })
    ).toBe("CREATE_LABEL");
  });

  it("does not ask admin to create Shippo labels", () => {
    expect(
      resolveNextAdminAction({
        fulfilmentMode: "shippo",
        fulfilmentStatus: "PACKAGING_VERIFIED",
        shippingLabelUrl: null,
      })
    ).toBe("NONE");
  });

  it("maps reported feedback to review feedback", () => {
    expect(resolveNextAdminAction({ requiresAdminAction: true })).toBe("REVIEW_FEEDBACK");
  });
});

describe("waiting-since helpers", () => {
  it("prefers fulfilment_status_changed_at once packaging is submitted", () => {
    expect(
      packagingActionRequiredSince({
        fulfilment_status: "PACKAGING_SUBMITTED",
        fulfilment_status_changed_at: "2026-08-18T09:00:00.000Z",
        updated_at: "2026-08-18T10:00:00.000Z",
        created_at: "2026-08-17T12:00:00.000Z",
      })
    ).toBe("2026-08-18T09:00:00.000Z");
  });

  it("prefers reviewed_at for label actions", () => {
    expect(
      labelActionRequiredSince({
        reviewed_at: "2026-08-18T08:00:00.000Z",
        fulfilment_status_changed_at: "2026-08-18T07:00:00.000Z",
        created_at: "2026-08-17T12:00:00.000Z",
      })
    ).toBe("2026-08-18T08:00:00.000Z");
  });

  it("requires at least three packaging photos", () => {
    expect(isPackagingAwaitingReview("SUBMITTED", 2)).toBe(false);
    expect(isPackagingAwaitingReview("SUBMITTED", 3)).toBe(true);
    expect(isPackagingAwaitingReview(null, 4)).toBe(true);
    expect(isPackagingAwaitingReview("VERIFIED", 4)).toBe(false);
  });
});

describe("formatAdminUserLabel", () => {
  it("uses first name and surname initial", () => {
    expect(formatAdminUserLabel({ first_name: "James", surname: "Riley", email: "j@x.com" })).toBe(
      "James R."
    );
  });

  it("falls back to email", () => {
    expect(formatAdminUserLabel({ email: "seller@teevo.test" })).toBe("seller@teevo.test");
  });
});

describe("already processed payload", () => {
  it("detects the shared error code", () => {
    expect(isAlreadyProcessedPayload({ code: "ALREADY_PROCESSED", error: "done" })).toBe(true);
    expect(isAlreadyProcessedPayload({ error: "Failed" })).toBe(false);
  });
});
