import { afterEach, describe, expect, it } from "vitest";
import {
  browseModelSearchHref,
  formatListingPrice,
  FULL_LISTING_ASSESSED,
  HEAD_ONLY_UNVERIFIED_BODY,
  RESULTS_EMPTY_LISTINGS_BODY,
  RESULTS_EMPTY_LISTINGS_TITLE,
  RESULTS_INVENTORY_UNAVAILABLE,
  RESULTS_LOADING_BODY,
  RESULTS_REFRESH_ERROR_BODY,
} from "@/lib/match/app/present-results-state";
import {
  mapTeevoListingToInventoryItem,
  primaryListingPhotoUrl,
} from "@/lib/match/inventory/teevo-listings";
import { loadMatchIntelligence, matchReferenceDirectory } from "@/lib/match";

describe("results state copy", () => {
  it("keeps empty stock, a failed stock check, and a failed refresh distinct", () => {
    expect(RESULTS_EMPTY_LISTINGS_TITLE).toMatch(/No matching Teevo listings/);
    expect(RESULTS_EMPTY_LISTINGS_BODY).toMatch(/model-level recommendation still applies/);
    expect(RESULTS_INVENTORY_UNAVAILABLE).toMatch(/couldn't check Teevo listings/i);
    expect(RESULTS_INVENTORY_UNAVAILABLE).not.toMatch(/No matching Teevo listings/);
    expect(RESULTS_REFRESH_ERROR_BODY).toMatch(/previous results are unchanged/);
    expect(RESULTS_LOADING_BODY).toMatch(/No Fit scores are being inferred/);
    expect(HEAD_ONLY_UNVERIFIED_BODY).toMatch(/not a complete match/);
    expect(FULL_LISTING_ASSESSED).toMatch(/loft and shaft/i);
    expect(FULL_LISTING_ASSESSED).not.toMatch(/Best Match|Best Value|Budget Option/);
    expect(formatListingPrice(18000)).toBe("£180.00");
    expect(formatListingPrice(0)).toBeNull();
    expect(browseModelSearchHref("TaylorMade", "SIM Max")).toBe(
      "/?category=Driver&brand=TaylorMade&search=SIM+Max"
    );
    expect(browseModelSearchHref("TaylorMade", "  ")).toBeNull();
  });
});

describe("primary listing photo", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  afterEach(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  });

  it("uses a public seller photo and ignores verification images", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(
      primaryListingPhotoUrl([
        {
          storage_path: "listing/secret-main.webp",
          sort_order: 0,
          visibility: "verification_only",
        },
        {
          storage_path: "listing/hero-main.webp",
          sort_order: 1,
          visibility: "public",
        },
      ])
    ).toBe(
      "https://example.supabase.co/storage/v1/object/public/listings/listing/hero-thumb.webp"
    );
    expect(
      primaryListingPhotoUrl([
        {
          storage_path: "listing/hidden-main.webp",
          visibility: "public",
          storage_bucket: "listing-verification",
        },
      ])
    ).toBeNull();
    expect(
      primaryListingPhotoUrl([
        {
          storage_path: "listing/serial-main.webp",
          sort_order: 0,
          visibility: "public",
          image_type: "hosel_serial",
        },
        {
          storage_path: "listing/hero-main.webp",
          sort_order: 1,
          visibility: "public",
          image_type: "hero",
        },
      ])
    ).toBe(
      "https://example.supabase.co/storage/v1/object/public/listings/listing/hero-thumb.webp"
    );
  });

  it("attaches the photo without changing whether the listing can be bought", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const intel = loadMatchIntelligence(matchReferenceDirectory());
    const mapped = mapTeevoListingToInventoryItem(
      {
        id: "photo-row",
        user_id: "u1",
        brand: "PING",
        model: "G430 SFT",
        title: "PING G430 SFT",
        handed: "right",
        degree: "10.5",
        degree_numeric: 10.5,
        shaft: null,
        shaft_flex: null,
        condition: "Good",
        price: 19900,
        status: "verified",
        archived_at: null,
        buying_paused: false,
        availability_confirmation_status: null,
        listing_images: [
          {
            storage_path: "photo-row/0-main.webp",
            sort_order: 0,
            visibility: "public",
          },
        ],
      },
      intel
    );
    expect(mapped.availability_status).toBe("AVAILABLE");
    expect(mapped.primary_image_url).toBe(
      "https://example.supabase.co/storage/v1/object/public/listings/photo-row/0-thumb.webp"
    );
  });
});
