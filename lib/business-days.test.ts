import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  addCalendarDays,
  businessDaysBetween,
  calendarDaysBetween,
  endOfLondonDay,
  formatDispatchDeadline,
  getDispatchUrgency,
  isBusinessDay,
  londonDateString,
  previousBusinessDay,
  previousCalendarDay,
} from "@/lib/business-days";
import { canRequestDispatchExtension } from "@/lib/dispatch-display";
import {
  computeInitialDispatchDeadline,
  dispatchCancelEligibility,
  nextDispatchClockState,
  shouldSendAfterPurchaseReminder,
  type DispatchClockRow,
} from "@/lib/dispatch-deadline";

const holidays = new Set<string>();

describe("calendar days", () => {
  it("adds 5 calendar days from Monday 10 August 2026 to Saturday 15 August", () => {
    const from = new Date("2026-08-10T12:00:00+01:00");
    const deadline = addCalendarDays(from, 5);
    expect(londonDateString(deadline)).toBe("2026-08-15");
    expect(deadline.getTime()).toBe(endOfLondonDay("2026-08-15").getTime());
  });

  it("keeps a weekend deadline instead of rolling to Monday", () => {
    const tuesday = new Date("2026-08-11T12:00:00+01:00");
    const deadline = addCalendarDays(tuesday, 5);
    expect(londonDateString(deadline)).toBe("2026-08-16");
    expect(deadline.getTime()).toBe(endOfLondonDay("2026-08-16").getTime());
  });

  it("counts calendar days between pause and resume, including weekends", () => {
    const paused = new Date("2026-08-14T14:00:00+01:00");
    const resumed = new Date("2026-08-17T14:00:00+01:00");
    expect(calendarDaysBetween(paused, resumed)).toBe(3);
    expect(calendarDaysBetween(paused, paused)).toBe(0);
  });

  it("previous calendar day before Saturday is Friday", () => {
    const saturday = addCalendarDays(new Date("2026-08-10T12:00:00+01:00"), 5);
    expect(londonDateString(previousCalendarDay(saturday))).toBe("2026-08-14");
  });

  it("classifies urgency against the stored calendar deadline", () => {
    const deadline = addCalendarDays(new Date("2026-08-10T12:00:00+01:00"), 5);
    expect(getDispatchUrgency(deadline, new Date("2026-08-10T12:00:00+01:00"))).toBe("normal");
    expect(getDispatchUrgency(deadline, new Date("2026-08-13T12:00:00+01:00"))).toBe("approaching");
    expect(getDispatchUrgency(deadline, new Date("2026-08-15T12:00:00+01:00"))).toBe("today");
    expect(getDispatchUrgency(deadline, new Date("2026-08-16T00:00:00+01:00"))).toBe("overdue");
  });
});

describe("business days", () => {
  it("adds 5 business days from Monday 10 August 2026 to Monday 17 August", () => {
    const from = new Date("2026-08-10T12:00:00+01:00");
    const deadline = addBusinessDays(from, 5, holidays);
    expect(londonDateString(deadline)).toBe("2026-08-17");
    expect(deadline.getTime()).toBe(endOfLondonDay("2026-08-17").getTime());
    expect(londonDateString(endOfLondonDay("2026-08-17"))).toBe("2026-08-17");
  });

  it("skips weekends", () => {
    const friday = new Date("2026-08-14T09:00:00+01:00");
    const next = addBusinessDays(friday, 1, holidays);
    expect(londonDateString(next)).toBe("2026-08-17");
  });

  it("skips a configured bank holiday", () => {
    const before = new Date("2026-08-28T12:00:00+01:00");
    const withHoliday = addBusinessDays(before, 1, new Set(["2026-08-31"]));
    expect(londonDateString(withHoliday)).toBe("2026-09-01");
  });

  it("counts business days between pause and resume", () => {
    const paused = new Date("2026-08-10T14:00:00+01:00");
    const resumed = new Date("2026-08-12T14:00:00+01:00");
    expect(businessDaysBetween(paused, resumed, holidays)).toBe(2);
    expect(businessDaysBetween(paused, paused, holidays)).toBe(0);
  });

  it("formats deadlines without a year in the same year", () => {
    const now = new Date("2026-08-10T12:00:00+01:00");
    expect(formatDispatchDeadline("2026-08-17T22:59:59.999Z", now)).toMatch(/Monday 17 August/);
  });

  it("includes the year when the deadline is already in the past", () => {
    const now = new Date("2026-08-17T11:00:00+01:00");
    expect(formatDispatchDeadline("2026-03-04T23:59:59.999Z", now)).toMatch(/Wednesday,? 4 March 2026/);
  });

  it("previous business day before Monday is Friday", () => {
    const monday = addBusinessDays(new Date("2026-08-10T12:00:00+01:00"), 5, holidays);
    expect(londonDateString(previousBusinessDay(monday, holidays))).toBe("2026-08-14");
  });

  it("does not treat Saturday as a business day", () => {
    expect(isBusinessDay("2026-08-15", holidays)).toBe(false);
    expect(isBusinessDay("2026-08-17", holidays)).toBe(true);
  });
});

describe("dispatch clock pause", () => {
  const base: DispatchClockRow = {
    id: "tx-1",
    status: "pending",
    shipped_at: null,
    cancellation_status: null,
    packaging_source: null,
    starter_pack_dispatched_at: null,
    packaging_status: null,
    fulfilment_mode: "shippo",
    fulfilment_status: "PAID",
    shippo_label_url: null,
    shipping_label_url: null,
    dispatch_deadline_at: "2026-08-15T22:59:59.999Z",
    original_dispatch_deadline_at: "2026-08-15T22:59:59.999Z",
    dispatch_clock_paused_at: null,
    dispatch_clock_pause_reason: null,
  };

  it("pauses for packaging review without changing the deadline", () => {
    const next = nextDispatchClockState(
      { ...base, packaging_status: "SUBMITTED" },
      new Date("2026-08-11T12:00:00+01:00")
    );
    expect(next.dispatch_clock_pause_reason).toBe("packaging_review");
    expect(next.dispatch_deadline_at).toBe(base.dispatch_deadline_at);
    expect(next.changed).toBe(true);
  });

  it("keeps paused_at when the Teevo wait reason changes", () => {
    const pausedAt = "2026-08-11T12:00:00.000Z";
    const next = nextDispatchClockState(
      {
        ...base,
        dispatch_clock_paused_at: pausedAt,
        dispatch_clock_pause_reason: "packaging_review",
        packaging_status: "VERIFIED",
        fulfilment_mode: "manual",
        fulfilment_status: "PACKAGING_VERIFIED",
      },
      new Date("2026-08-12T12:00:00+01:00")
    );
    expect(next.dispatch_clock_paused_at).toBe(pausedAt);
    expect(next.dispatch_clock_pause_reason).toBe("manual_label");
    expect(next.dispatch_deadline_at).toBe(base.dispatch_deadline_at);
  });

  it("adds paused calendar days when the wait ends", () => {
    const next = nextDispatchClockState(
      {
        ...base,
        dispatch_clock_paused_at: "2026-08-10T12:00:00.000Z",
        dispatch_clock_pause_reason: "packaging_review",
        packaging_status: "REJECTED",
      },
      new Date("2026-08-12T12:00:00.000Z")
    );
    expect(next.dispatch_clock_paused_at).toBeNull();
    expect(next.resumedDays).toBe(2);
    expect(next.changed).toBe(true);
    expect(londonDateString(new Date(next.dispatch_deadline_at!))).toBe("2026-08-17");
  });

  it("adds weekend days when a pause spans Saturday and Sunday", () => {
    const next = nextDispatchClockState(
      {
        ...base,
        dispatch_clock_paused_at: "2026-08-14T12:00:00+01:00",
        dispatch_clock_pause_reason: "packaging_review",
        packaging_status: "REJECTED",
      },
      new Date("2026-08-17T12:00:00+01:00")
    );
    expect(next.resumedDays).toBe(3);
    expect(londonDateString(new Date(next.dispatch_deadline_at!))).toBe("2026-08-18");
  });
});

describe("extension eligibility", () => {
  it("rejects a second extension or a request after the deadline", () => {
    const open = {
      status: "pending",
      shipped_at: null,
      cancellation_status: null,
      dispatch_deadline_at: new Date(Date.now() + 86400000 * 3).toISOString(),
      dispatch_extension_status: null as string | null,
    };
    expect(canRequestDispatchExtension(open)).toBe(true);
    expect(canRequestDispatchExtension({ ...open, dispatch_extension_status: "requested" })).toBe(false);
    expect(
      canRequestDispatchExtension({
        ...open,
        dispatch_deadline_at: new Date(Date.now() - 1000).toISOString(),
      })
    ).toBe(false);
    expect(canRequestDispatchExtension({ ...open, status: "shipped" })).toBe(false);
  });
});

describe("after-purchase reminder gate", () => {
  it("does not send once the dispatch deadline has passed", () => {
    const createdAt = new Date("2026-02-25T20:46:00.000Z");
    const deadline = new Date("2026-03-04T23:59:59.999Z");
    const now = new Date("2026-08-17T10:00:00.000Z");
    expect(
      shouldSendAfterPurchaseReminder({
        reminderAlreadySent: false,
        createdAt,
        deadline,
        now,
      })
    ).toBe(false);
  });

  it("sends two calendar days after purchase while the deadline is still open", () => {
    const createdAt = new Date("2026-08-10T12:00:00+01:00");
    const deadline = addCalendarDays(createdAt, 5);
    const now = new Date("2026-08-12T12:00:00+01:00");
    expect(
      shouldSendAfterPurchaseReminder({
        reminderAlreadySent: false,
        createdAt,
        deadline,
        now,
      })
    ).toBe(true);
    expect(
      shouldSendAfterPurchaseReminder({
        reminderAlreadySent: false,
        createdAt,
        deadline,
        now: new Date("2026-08-11T12:00:00+01:00"),
      })
    ).toBe(false);
  });
});

describe("initial dispatch deadline", () => {
  it("stores a Saturday night deadline for a Monday sale", () => {
    const { original, active } = computeInitialDispatchDeadline(
      new Date("2026-08-10T12:00:00+01:00"),
      5
    );
    expect(londonDateString(original)).toBe("2026-08-15");
    expect(active.getTime()).toBe(endOfLondonDay("2026-08-15").getTime());
  });
});

describe("dispatch cancel eligibility", () => {
  const pending: DispatchClockRow = {
    id: "tx-1",
    status: "pending",
    shipped_at: null,
    cancellation_status: null,
    packaging_source: null,
    starter_pack_dispatched_at: null,
    packaging_status: null,
    fulfilment_mode: "shippo",
    fulfilment_status: "PAID",
    shippo_label_url: null,
    shipping_label_url: null,
    dispatch_deadline_at: "2026-08-10T22:59:59.999Z",
    original_dispatch_deadline_at: "2026-08-10T22:59:59.999Z",
    dispatch_clock_paused_at: null,
    dispatch_clock_pause_reason: null,
  };

  it("aborts if the seller has already dispatched", () => {
    const now = new Date("2026-08-18T12:00:00+01:00");
    expect(
      dispatchCancelEligibility({ ...pending, status: "shipped", shipped_at: now.toISOString() }, { now })
    ).toEqual({ ok: false, error: "Order has already been dispatched", retryable: false });
    expect(dispatchCancelEligibility({ ...pending, shipped_at: now.toISOString() }, { now })).toEqual({
      ok: false,
      error: "Order has already been dispatched",
      retryable: false,
    });
  });

  it("does not cancel while the Teevo clock is paused", () => {
    const now = new Date("2026-08-18T12:00:00+01:00");
    const result = dispatchCancelEligibility(
      { ...pending, packaging_status: "SUBMITTED", dispatch_clock_paused_at: now.toISOString() },
      { now }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });
});
