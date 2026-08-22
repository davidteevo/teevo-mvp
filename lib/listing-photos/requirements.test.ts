import { describe, expect, it } from "vitest";
import { getPhotoSlots, usesGuidedPhotos } from "./requirements";
import { publicListingImages } from "@/lib/listing-images";

describe("getPhotoSlots", () => {
  it("requires crown and public shaft for drivers", () => {
    const slots = getPhotoSlots({ category: "Driver" });
    expect(slots.map((s) => s.imageType)).toEqual([
      "hero",
      "face",
      "sole",
      "crown",
      "hosel_serial",
      "shaft",
    ]);
    expect(slots.find((s) => s.imageType === "crown")?.visibility).toBe("public");
    expect(slots.find((s) => s.imageType === "hosel_serial")?.visibility).toBe(
      "verification_only"
    );
  });

  it("omits crown for driving irons", () => {
    const types = getPhotoSlots({ category: "Driving Irons" }).map((s) => s.imageType);
    expect(types).not.toContain("crown");
    expect(types).toContain("shaft");
  });

  it("builds a sole slot per wedge loft", () => {
    const slots = getPhotoSlots({
      category: "Wedges",
      listingFormat: "set",
      wedgeLofts: ["50", "54°", "58"],
    });
    const soles = slots.filter((s) => s.imageType === "wedge_specs");
    expect(soles).toHaveLength(3);
    expect(soles.map((s) => s.clubIdentifier)).toEqual(["50", "54", "58"]);
  });

  it("requires putter address, rear, neck and grip", () => {
    const types = getPhotoSlots({ category: "Putter" }).map((s) => s.imageType);
    expect(types).toEqual([
      "hero",
      "putter_address",
      "face",
      "sole",
      "putter_rear",
      "putter_neck",
      "grip",
    ]);
    expect(slotsVis(getPhotoSlots({ category: "Putter" }), "putter_neck")).toBe(
      "verification_only"
    );
  });

  it("does not guide clothing", () => {
    expect(usesGuidedPhotos("Clothing")).toBe(false);
    expect(getPhotoSlots({ category: "Clothing" })).toEqual([]);
  });
});

describe("publicListingImages", () => {
  it("treats null visibility as public and drops verification_only", () => {
    const filtered = publicListingImages([
      { storage_path: "a", sort_order: 0, visibility: null },
      { storage_path: "b", sort_order: 1, visibility: "verification_only" },
      { storage_path: "c", sort_order: 2, visibility: "public" },
    ]);
    expect(filtered.map((i) => i.storage_path)).toEqual(["a", "c"]);
  });
});

function slotsVis(slots: ReturnType<typeof getPhotoSlots>, type: string) {
  return slots.find((s) => s.imageType === type)?.visibility;
}
