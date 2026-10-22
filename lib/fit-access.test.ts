import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  FIT_COMING_SOON,
  FIT_NAV,
  LEGACY_MATCH_PATH,
  TEEVO_FIT_NAME,
  TEEVO_FIT_PATH,
  canAccessTeevoFit,
  showTeevoFitComingSoon,
} from "@/lib/fit-access";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("Teevo Fit access", () => {
  it("authorises only the existing admin role", () => {
    expect(canAccessTeevoFit("admin")).toBe(true);
    expect(canAccessTeevoFit("buyer")).toBe(false);
    expect(canAccessTeevoFit("seller")).toBe(false);
    expect(canAccessTeevoFit(null)).toBe(false);
    expect(canAccessTeevoFit(undefined)).toBe(false);
    expect(canAccessTeevoFit("")).toBe(false);
  });

  it("shows Coming Soon when Teevo Fit is disabled, and to anyone without access", () => {
    expect(showTeevoFitComingSoon("admin", false)).toBe(true);
    expect(showTeevoFitComingSoon("buyer", false)).toBe(true);
    expect(showTeevoFitComingSoon(null, false)).toBe(true);
    expect(showTeevoFitComingSoon("admin", true)).toBe(false);
    expect(showTeevoFitComingSoon("buyer", true)).toBe(true);
    expect(showTeevoFitComingSoon(null, true)).toBe(true);
  });
});

describe("Teevo Fit public copy and routes", () => {
  it("uses the Teevo Fit name and the agreed Coming Soon copy", () => {
    expect(TEEVO_FIT_NAME).toBe("Teevo Fit");
    expect(FIT_NAV).toEqual({
      label: "Teevo Fit",
      href: "/fit",
      comingSoon: "Coming Soon",
    });
    expect(FIT_COMING_SOON.heading).toBe("Find your fit. Play your best.");
    expect(FIT_COMING_SOON.description).toBe(
      "Meet Teevo Fit — a smarter way to find golf clubs suited to your game."
    );
    expect(FIT_COMING_SOON.detail).toContain("how you play");
    expect(FIT_COMING_SOON.status).toBe("Coming Soon");
    expect(FIT_COMING_SOON.cta).toBe("Explore Clubs");
    expect(FIT_COMING_SOON.ctaHref).toBe("/");
    expect(TEEVO_FIT_PATH).toBe("/fit");
    expect(LEGACY_MATCH_PATH).toBe("/match");
  });

  it("keeps Best Match as a recommendation category", () => {
    const labels = read("lib/match/app/present-head-choices.ts");
    expect(labels).toContain('BEST_MATCH: "Best Match"');
    expect(labels).toContain('ALTERNATIVE_MATCH: "Alternative Match"');
  });

  it("sends legacy /match to /fit without a public recommend API", () => {
    const legacy = read("app/match/page.tsx");
    expect(legacy).toContain("redirect(TEEVO_FIT_PATH)");
    expect(legacy).not.toContain("runCatalogueRecommendation");
    expect(fs.existsSync(path.join(root, "app/api/match"))).toBe(false);
    expect(fs.existsSync(path.join(root, "app/api/fit/recommend"))).toBe(false);
    expect(read("app/api/fit/status/route.ts")).not.toContain("runCatalogueRecommendation");
  });

  it("gates /fit on the server and keeps the fitting API admin-only", () => {
    const layout = read("app/fit/layout.tsx");
    expect(layout).toContain("viewerCanAccessTeevoFit");
    expect(layout).toContain("FitComingSoon");
    expect(layout).toContain("if (!authorised) return <FitComingSoon />");

    const page = read("app/fit/page.tsx");
    expect(page).toContain("MatchQuestionnaire");
    expect(page).not.toContain("runCatalogueRecommendation");
    expect(read("app/fit/results/page.tsx")).toContain("MatchResults");

    const recommend = read("app/api/admin/match/recommend/route.ts");
    const adminAt = recommend.indexOf("requireAdmin");
    const runAt = recommend.indexOf("runCatalogueRecommendation");
    expect(adminAt).toBeGreaterThanOrEqual(0);
    expect(runAt).toBeGreaterThan(adminAt);
    expect(recommend).toContain("public_match_enabled: false");
    expect(recommend).not.toContain("isMatchEnabled");
  });

  it("adds Teevo Fit to the hamburger menu and desktop nav", () => {
    const header = read("components/layout/Header.tsx");
    expect(header).toContain("TeevoFitMenuLink");
    expect(header.match(/<TeevoFitMenuLink /g)?.length).toBe(2);
    expect(header).toContain("FIT_NAV.href");
    expect(header).toContain("showTeevoFitComingSoon");
    expect(header).toContain("useTeevoFitEnabled");
    expect(read("app/dashboard/page.tsx")).toContain("useTeevoFitEnabled");
    const status = read("app/api/fit/status/route.ts");
    expect(status).toContain("isMatchEnabled");
    expect(status).not.toContain("runCatalogueRecommendation");
    expect(header).not.toContain("disabled={showFitComingSoon}");
    expect(read("app/dashboard/page.tsx")).toContain("FIT_NAV.href");
    expect(read("app/admin/_components/AdminNav.tsx")).not.toContain('href: "/admin/match"');
  });

  it("serves the questionnaire on /fit and redirects the old admin screens", () => {
    expect(read("components/match/MatchQuestionnaire.tsx")).toContain("TEEVO_FIT_PATH");
    expect(read("components/match/MatchQuestionnaire.tsx")).toContain("TEEVO_FIT_RESULTS_PATH");
    expect(read("components/match/MatchQuestionnaire.tsx")).not.toContain("/admin/match/questionnaire");
    expect(read("components/match/MatchResults.tsx")).not.toContain("/admin/match");
    expect(read("app/admin/match/page.tsx")).toContain("redirect(TEEVO_FIT_PATH)");
    expect(read("app/admin/match/questionnaire/page.tsx")).toContain("TEEVO_FIT_PATH");
    expect(read("app/admin/match/results/page.tsx")).toContain("redirect(TEEVO_FIT_RESULTS_PATH)");
  });

  it("does not leave Teevo Match in customer or admin UI source", () => {
    const files = [
      "app/fit/layout.tsx",
      "app/fit/page.tsx",
      "app/fit/results/page.tsx",
      "app/match/page.tsx",
      "app/admin/match/page.tsx",
      "app/admin/_components/AdminNav.tsx",
      "components/fit/FitComingSoon.tsx",
      "components/layout/Header.tsx",
      "components/layout/Footer.tsx",
      "components/match/MatchQuestionnaire.tsx",
      "components/match/MatchRefinementPanel.tsx",
      "components/match/results/ResultsHeading.tsx",
      "lib/match-settings.ts",
      "lib/match/app/present-guidance.ts",
      "lib/match/app/present-results-state.ts",
      "README.md",
    ];
    for (const file of files) {
      expect(read(file), file).not.toContain("Teevo Match");
    }
  });

  it("preserves analytics event identifiers", () => {
    const events = read("app/api/events/route.ts");
    expect(events).toContain('"match_questionnaire_started"');
    expect(events).toContain('"match_questionnaire_completed"');
    const questionnaire = read("components/match/MatchQuestionnaire.tsx");
    expect(questionnaire).toContain('track("match_questionnaire_started"');
    expect(questionnaire).toContain('track("match_questionnaire_completed"');
  });
});
