import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CreatorPrimaryObjective,
  DEFAULT_REFERRAL_SETTINGS,
} from "@/lib/referral/settings";

const ensureEmailSent = vi.fn();
const getReferralSettings = vi.fn();
const trackServerEvent = vi.fn();

vi.mock("@/lib/email-triggers", () => ({
  EmailTriggerType: {
    CREATOR_ONBOARDING_EXISTING: "creator_onboarding_existing",
    CREATOR_ONBOARDING_NEW: "creator_onboarding_new",
  },
  ensureEmailSent: (...args: unknown[]) => ensureEmailSent(...args),
}));

vi.mock("@/lib/referral/settings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/referral/settings")>(
    "@/lib/referral/settings"
  );
  return {
    ...actual,
    getReferralSettings: (...args: unknown[]) => getReferralSettings(...args),
  };
});

vi.mock("@/lib/starter-pack", () => ({
  trackServerEvent: (...args: unknown[]) => trackServerEvent(...args),
}));

vi.mock("@/lib/app-env", () => ({
  getAppUrl: () => "https://app.teevohq.com",
}));

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

describe("sendCreatorOnboardingEmail", () => {
  beforeEach(() => {
    ensureEmailSent.mockReset();
    getReferralSettings.mockReset();
    trackServerEvent.mockReset();
    getReferralSettings.mockResolvedValue({
      ...DEFAULT_REFERRAL_SETTINGS,
      creatorPrimaryObjective: CreatorPrimaryObjective.LISTINGS,
    });
    ensureEmailSent.mockResolvedValue(true);
    trackServerEvent.mockResolvedValue(undefined);
  });

  it("sends Email A with single Hub CTA and no reward repetition", async () => {
    const { sendCreatorOnboardingEmail } = await import("@/lib/creator/onboarding-email");
    const result = await sendCreatorOnboardingEmail({} as never, {
      creatorId: "creator-1",
      userId: "user-1",
      email: "creator@example.com",
      firstName: "Alex",
      referralCode: "ALEX",
      kind: "existing",
    });

    expect(result).toEqual({ sent: true, kind: "existing" });
    expect(ensureEmailSent).toHaveBeenCalledTimes(1);
    const args = ensureEmailSent.mock.calls[0][1];
    const body = args.variables.body as string;

    expect(args.emailType).toBe("creator_onboarding_existing");
    expect(args.referenceId).toBe("creator-1");
    expect(args.subject).toContain("Teevo Creator");
    expect(args.variables.cta_link).toBe("https://app.teevohq.com/dashboard/creator");
    expect(args.variables.cta_text).toBe("Open my Creator Hub");

    expect(body).toContain("£10 PER SUCCESSFUL LISTING");
    expect(body).toContain("10 successful listings = £100");
    expect(countOccurrences(body, "£10 PER SUCCESSFUL LISTING")).toBe(1);
    expect(countOccurrences(body, "10 successful listings = £100")).toBe(1);
    expect(body).not.toContain("Earn £10 for every successful listing");
    expect(countOccurrences(body, "Open my Creator Hub")).toBe(1);
    expect(body).not.toContain("/r/ALEX");
    expect(body).toContain("Send your link to 3 golfers you know with equipment they could sell.");
    expect(body).toContain("Instagram Stories");
    expect(body).toContain("QUICK START");
    expect(body).toContain("Know 3 golfers with unused clubs?");
    expect(body).toContain("qualifying successful listing");

    expect(trackServerEvent).toHaveBeenCalledWith(
      expect.anything(),
      "creator_onboarding_email_sent",
      expect.objectContaining({
        properties: expect.objectContaining({
          emailType: "existing",
          objective: "listings",
          rewardAmountPence: 1000,
        }),
      })
    );
  });

  it("sends Email B with single Activate CTA and no reward repetition", async () => {
    const { sendCreatorOnboardingEmail } = await import("@/lib/creator/onboarding-email");
    const result = await sendCreatorOnboardingEmail({} as never, {
      creatorId: "creator-2",
      userId: "user-2",
      email: "new@example.com",
      firstName: "Sam",
      referralCode: "SAM",
      kind: "new",
      accountActivationUrl: "https://app.teevohq.com/api/auth/set-password?token_hash=abc",
    });

    expect(result.sent).toBe(true);
    expect(result.kind).toBe("new");
    const args = ensureEmailSent.mock.calls[0][1];
    const body = args.variables.body as string;

    expect(args.emailType).toBe("creator_onboarding_new");
    expect(args.subject).toContain("Welcome");
    expect(args.variables.cta_link).toContain("set-password");
    expect(args.variables.cta_text).toBe("Activate my Teevo account");
    expect(countOccurrences(body, "Activate my Teevo account")).toBe(1);
    expect(body).not.toContain("Join Teevo & get my creator link");
    expect(countOccurrences(body, "£10 PER SUCCESSFUL LISTING")).toBe(1);
    expect(countOccurrences(body, "10 successful listings = £100")).toBe(1);
    expect(body).not.toContain("Earn £10 for every successful listing");
    expect(body).not.toContain("/r/SAM");
    expect(body).toContain("QUICK START");
  });

  it("skips Email B when activation URL is missing", async () => {
    const { sendCreatorOnboardingEmail } = await import("@/lib/creator/onboarding-email");
    const result = await sendCreatorOnboardingEmail({} as never, {
      creatorId: "creator-3",
      userId: "user-3",
      email: "new@example.com",
      kind: "new",
      accountActivationUrl: null,
    });
    expect(result).toEqual({
      sent: false,
      kind: "new",
      skippedReason: "missing_activation_url",
    });
    expect(ensureEmailSent).not.toHaveBeenCalled();
  });

  it("does not resend when ensureEmailSent reports already sent", async () => {
    ensureEmailSent.mockResolvedValue(false);
    const { sendCreatorOnboardingEmail } = await import("@/lib/creator/onboarding-email");
    const result = await sendCreatorOnboardingEmail({} as never, {
      creatorId: "creator-1",
      userId: "user-1",
      email: "creator@example.com",
      kind: "existing",
    });
    expect(result).toEqual({
      sent: false,
      kind: "existing",
      skippedReason: "already_sent",
    });
    expect(trackServerEvent).not.toHaveBeenCalled();
  });

  it("switches hero and first-action copy with objective", async () => {
    getReferralSettings.mockResolvedValue({
      ...DEFAULT_REFERRAL_SETTINGS,
      creatorPrimaryObjective: CreatorPrimaryObjective.NEW_USERS,
      creatorNewUserRewardPence: 200,
    });
    const { sendCreatorOnboardingEmail } = await import("@/lib/creator/onboarding-email");
    await sendCreatorOnboardingEmail({} as never, {
      creatorId: "creator-4",
      userId: "user-4",
      email: "creator@example.com",
      kind: "existing",
    });
    const body = ensureEmailSent.mock.calls[0][1].variables.body as string;
    expect(body).toContain("£2 PER NEW USER");
    expect(body).toContain("10 new users = £20");
    expect(countOccurrences(body, "£2 PER NEW USER")).toBe(1);
    expect(body).toContain("Send your link to 3 golfers who'd love Teevo.");
    expect(body).toContain("Know 3 golfers not on Teevo yet?");
    expect(body).not.toContain("unused clubs");
  });
});
