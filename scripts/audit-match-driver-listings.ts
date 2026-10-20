/**
 * Staging/local audit: Driver listing completeness for Match gates.
 *
 * Usage (with service-role env):
 *   npx tsx scripts/audit-match-driver-listings.ts
 *
 * Reports counts of public Drivers missing handed / loft / shaft / shaft_flex,
 * and purchasable subset — does not mutate data.
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skip live audit."
    );
    process.exit(2);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("listings")
    .select(
      "id, status, archived_at, buying_paused, availability_confirmation_status, handed, degree, degree_numeric, shaft, shaft_flex, brand, model"
    )
    .eq("category", "Driver")
    .in("status", ["pending", "verified"])
    .is("archived_at", null);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  const missing = {
    handed: 0,
    degree: 0,
    shaft: 0,
    shaft_flex: 0,
    brand_or_model: 0,
  };
  let purchasable = 0;
  let withAllGates = 0;

  for (const r of rows) {
    if (!r.handed) missing.handed++;
    if (!r.degree && r.degree_numeric == null) missing.degree++;
    if (!r.shaft || String(r.shaft).toLowerCase() === "unknown") missing.shaft++;
    if (!r.shaft_flex) missing.shaft_flex++;
    if (!r.brand || !r.model) missing.brand_or_model++;

    const isPurch =
      r.status === "verified" &&
      !r.archived_at &&
      !r.buying_paused &&
      r.availability_confirmation_status !== "required";
    if (isPurch) purchasable++;

    if (
      isPurch &&
      r.handed &&
      (r.degree || r.degree_numeric != null) &&
      r.shaft &&
      String(r.shaft).toLowerCase() !== "unknown" &&
      r.shaft_flex &&
      r.brand &&
      r.model
    ) {
      withAllGates++;
    }
  }

  const report = {
    total_public_drivers: rows.length,
    purchasable_verified: purchasable,
    purchasable_with_identity_fields: withAllGates,
    missing_among_public: missing,
    note: "Match also requires unique catalogue_key/shaft_key resolution against DRIVER_V1/SHAFT_V1 — string fields alone are not sufficient.",
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
