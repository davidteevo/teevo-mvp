import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listingPhotoGuideSrc } from "./guide-art";
import { getPhotoSlots } from "./requirements";

function onDisk(src: string) {
  return existsSync(join(process.cwd(), "public", src.replace(/^\//, "")));
}

describe("listingPhotoGuideSrc", () => {
  it("has an SVG for every guided slot", () => {
    const cases = [
      { category: "Driver" },
      { category: "Woods" },
      { category: "Hybrids" },
      { category: "Driving Irons" },
      { category: "Irons", listingFormat: "single" as const },
      { category: "Irons", listingFormat: "set" as const },
      { category: "Wedges", listingFormat: "single" as const },
      { category: "Wedges", listingFormat: "set" as const, wedgeLofts: ["50", "54"] },
      { category: "Putter" },
    ];
    for (const input of cases) {
      for (const slot of getPhotoSlots(input)) {
        const src = listingPhotoGuideSrc({
          category: input.category,
          listingFormat: input.listingFormat,
          illustrationId: slot.illustrationId,
        });
        expect(onDisk(src), `${input.category} ${slot.key} -> ${src}`).toBe(true);
      }
    }
  });
});
