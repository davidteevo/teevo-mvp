import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShaftOptionsSection } from "@/components/match/results/ShaftOptionsSection";
import {
  OEM_SHAFT_OFFERING_NOTE,
  type PresentedShaftOptionsSection,
} from "@/lib/match/app/present-shaft-options";

const namedTwo: PresentedShaftOptionsSection = {
  mode: "named",
  heading: "Shafts worth considering",
  offeringNote: OEM_SHAFT_OFFERING_NOTE,
  primary: {
    shaftKey: "ping|alta-cb-black|2023|55|stiff",
    title: "PING ALTA CB Black 55 Stiff",
    flexLabel: "Stiff",
    weightLabel: "About 60 g recorded weight",
    launchLabel: "mid launch",
    why: "Stiff flex suits the speed range you gave.",
    isPrimary: true,
  },
  alternatives: [
    {
      shaftKey: "ping|tour-2-0-chrome|2023|65|regular",
      title: "PING Tour 2.0 Chrome 65 Regular",
      flexLabel: "Regular",
      weightLabel: "About 56 g recorded weight",
      launchLabel: "mid launch",
      why: "Regular flex suits the speed range you gave.",
      isPrimary: false,
    },
  ],
  differenceNote: "Both are strong on the assessed characteristics. Main differences: Stiff versus Regular flex; about 60 g versus 56 g recorded weight.",
  suggestedLoftLabel:
    "Suggested loft territory: about 9°–11.5° (confirm on a real club; not a verified build).",
};

describe("ShaftOptionsSection", () => {
  it("renders named primary option and offering note", () => {
    const html = renderToStaticMarkup(
      <ShaftOptionsSection
        catalogueKey="ping|g430-max|2023"
        presented={namedTwo}
        suppressEmptyGuidance
      />
    );
    expect(html).toContain("Shafts worth considering");
    expect(html).toContain("PING ALTA CB Black 55 Stiff");
    expect(html).toContain(OEM_SHAFT_OFFERING_NOTE);
    expect(html).toContain("Suggested loft territory");
    expect(html).toContain("Show other shaft option");
    expect(html).not.toContain("Perfect shaft");
    expect(html).not.toContain("verified complete");
  });

  it("renders a single option without a second-slot filler", () => {
    const one: PresentedShaftOptionsSection = {
      ...namedTwo,
      alternatives: [],
      differenceNote: null,
    };
    const html = renderToStaticMarkup(
      <ShaftOptionsSection
        catalogueKey="ping|g430-max|2023"
        presented={one}
        suppressEmptyGuidance
      />
    );
    expect(html).toContain("PING ALTA CB Black 55 Stiff");
    expect(html).not.toContain("Show other shaft option");
  });

  it("suppresses empty guidance when the page already shows shared guidance", () => {
    const empty: PresentedShaftOptionsSection = {
      mode: "none",
      heading: "Shaft",
      offeringNote: null,
      primary: null,
      alternatives: [],
      differenceNote: null,
      suggestedLoftLabel: "Suggested loft territory: about 9°–11.5° (confirm on a real club; not a verified build).",
    };
    const html = renderToStaticMarkup(
      <ShaftOptionsSection
        catalogueKey="wilson|dynapwr-titanium|2023"
        presented={empty}
        suppressEmptyGuidance
      />
    );
    expect(html).toContain("Loft");
    expect(html).toContain("Suggested loft territory");
    expect(html).not.toContain("What to look for in a shaft");
  });

  it("keeps long shaft names wrappable in markup", () => {
    const longName: PresentedShaftOptionsSection = {
      ...namedTwo,
      primary: {
        ...namedTwo.primary!,
        title:
          "Mitsubishi Chemical TENSEI AV-XLINK Blue 65 Stiff Extra Long Display Name",
      },
      alternatives: [],
      differenceNote: null,
    };
    const html = renderToStaticMarkup(
      <ShaftOptionsSection
        catalogueKey="ping|g430-max|2023"
        presented={longName}
        suppressEmptyGuidance
      />
    );
    expect(html).toContain("break-words");
    expect(html).toContain("Mitsubishi Chemical TENSEI AV-XLINK Blue 65");
  });
});
