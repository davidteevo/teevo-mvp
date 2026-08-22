import type { Listing, ListingClub } from "@/types/database";
import { formatSpecValue } from "@/lib/club-specs/unknown";
import { isGolfEquipmentCategory } from "@/lib/club-specs/schemas";

export function getClubDetailsRows(listing: Listing): { label: string; value: string }[] {
  if (!isGolfEquipmentCategory(listing.category)) return [];

  const rows: { label: string; value: string }[] = [];
  const hand =
    listing.handed === "right" ? "Right" : listing.handed === "left" ? "Left" : null;
  if (hand) rows.push({ label: "Hand", value: hand });

  if (listing.listing_format === "set" && listing.category === "Irons" && listing.set_composition?.length) {
    rows.push({ label: "Set", value: listing.set_composition.join(", ") });
  }
  if (listing.listing_format === "single" && listing.iron_number) {
    rows.push({ label: "Iron", value: listing.iron_number });
  }
  if (listing.head_number) {
    rows.push({ label: "Club", value: listing.head_number });
  }

  const loft = formatSpecValue(listing.degree, { appendDegree: true });
  if (loft) rows.push({ label: "Loft", value: loft });

  const bounce = formatSpecValue(listing.bounce, { appendDegree: true });
  if (bounce) rows.push({ label: "Bounce", value: bounce });

  const grind = formatSpecValue(listing.grind);
  if (grind) rows.push({ label: "Grind", value: grind });

  const shaft = formatSpecValue(listing.shaft);
  if (shaft) rows.push({ label: "Shaft", value: shaft });

  const flex = formatSpecValue(listing.shaft_flex);
  if (flex) rows.push({ label: "Flex", value: flex });

  const length = formatSpecValue(listing.club_length);
  if (length) {
    rows.push({
      label: listing.category === "Putter" ? "Length" : "Length vs standard",
      value: length,
    });
  }

  const lie = formatSpecValue(listing.lie_angle, { appendDegree: true });
  if (lie) rows.push({ label: "Lie", value: lie });

  const weight = formatSpecValue(listing.shaft_weight);
  if (weight) rows.push({ label: "Shaft weight", value: weight });

  const material = formatSpecValue(listing.shaft_material);
  if (material) rows.push({ label: "Shaft material", value: material });

  const gripParts = [formatSpecValue(listing.grip_brand), formatSpecValue(listing.grip_model)].filter(
    Boolean
  );
  if (gripParts.length) rows.push({ label: "Grip", value: gripParts.join(" ") });

  const gripSize = formatSpecValue(listing.grip_size);
  if (gripSize) rows.push({ label: "Grip size", value: gripSize });

  const gripCond = formatSpecValue(listing.grip_condition);
  if (gripCond) rows.push({ label: "Grip condition", value: gripCond });

  if (listing.standard_spec_status === "standard") rows.push({ label: "Spec", value: "Standard" });
  if (listing.standard_spec_status === "customised") rows.push({ label: "Spec", value: "Customised" });
  if (listing.standard_spec_status === "unknown") rows.push({ label: "Spec", value: "Unknown" });

  if (listing.headcover_included === true) rows.push({ label: "Headcover", value: "Included" });
  if (listing.headcover_included === false) rows.push({ label: "Headcover", value: "Not included" });

  return rows.filter((r) => r.value);
}

export function ClubDetailsTable({ listing }: { listing: Listing }) {
  const rows = getClubDetailsRows(listing);
  const wedgeSet =
    listing.listing_format === "set" &&
    listing.category === "Wedges" &&
    (listing.listing_clubs?.length ?? 0) > 0;

  if (rows.length === 0 && !wedgeSet) return null;

  return (
    <div className="mt-4 space-y-4">
      {rows.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-mowing-green mb-2">Club details</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="text-mowing-green/60">{r.label}</dt>
                <dd className="text-mowing-green font-medium text-right">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {wedgeSet ? <IncludedWedgesTable clubs={listing.listing_clubs!} /> : null}
    </div>
  );
}

export function IncludedWedgesTable({ clubs }: { clubs: ListingClub[] }) {
  const sorted = [...clubs].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div>
      <h2 className="text-sm font-semibold text-mowing-green mb-2">Included wedges</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mowing-green/60 border-b border-mowing-green/15">
              <th className="py-2 pr-3 font-medium">Loft</th>
              <th className="py-2 pr-3 font-medium text-right">Bounce</th>
              <th className="py-2 font-medium text-right">Grind</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-b border-mowing-green/10">
                <td className="py-2 pr-3 text-mowing-green font-medium">
                  {formatSpecValue(c.degree, { appendDegree: true }) ?? "—"}
                </td>
                <td className="py-2 pr-3 text-right text-mowing-green">
                  {formatSpecValue(c.bounce, { appendDegree: true }) ?? "—"}
                </td>
                <td className="py-2 text-right text-mowing-green">
                  {formatSpecValue(c.grind) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Compact ·-joined line for cards */
export function buildClubSpecLine(listing: Listing): string {
  const parts: string[] = [];
  if (listing.listing_format === "set") parts.push("Set");
  const loft = formatSpecValue(listing.degree, { appendDegree: true });
  if (loft) parts.push(loft);
  if (listing.listing_format === "set" && listing.listing_clubs?.length) {
    const lofts = listing.listing_clubs
      .map((c) => formatSpecValue(c.degree, { appendDegree: true }))
      .filter(Boolean);
    if (lofts.length) parts.push(lofts.join("/"));
  }
  if (listing.set_composition?.length) parts.push(listing.set_composition.join("-"));
  if (listing.iron_number) parts.push(listing.iron_number);
  const flex = formatSpecValue(listing.shaft_flex);
  if (flex) parts.push(flex);
  if (listing.handed === "right") parts.push("RH");
  if (listing.handed === "left") parts.push("LH");
  const length = formatSpecValue(listing.club_length);
  if (length) parts.push(length);
  return parts.join(" · ");
}
