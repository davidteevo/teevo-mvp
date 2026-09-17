import { describe, expect, it } from "vitest";
import { buildZipStore } from "@/lib/zip-store";

describe("buildZipStore", () => {
  it("builds a readable uncompressed zip with local and central headers", () => {
    const data = new TextEncoder().encode("hello");
    const zip = buildZipStore([{ name: "public/01-hero.txt", data }]);

    // Local file header signature
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);

    // End of central directory signature near the end
    const endSig = zip.slice(zip.length - 22, zip.length - 18);
    expect(Array.from(endSig)).toEqual([0x50, 0x4b, 0x05, 0x06]);

    // File count in EOCD
    expect(zip[zip.length - 14]).toBe(1);
    expect(zip[zip.length - 12]).toBe(1);
  });

  it("includes multiple entry names", () => {
    const zip = buildZipStore([
      { name: "public/a.webp", data: new Uint8Array([1, 2, 3]) },
      { name: "verification/b.webp", data: new Uint8Array([4, 5]) },
    ]);
    const asText = new TextDecoder().decode(zip);
    expect(asText).toContain("public/a.webp");
    expect(asText).toContain("verification/b.webp");
  });
});
