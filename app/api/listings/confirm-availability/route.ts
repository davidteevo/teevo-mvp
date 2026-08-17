import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAvailabilityToken } from "@/lib/availability-token";
import {
  applySellerAvailabilityResponses,
  loadConfirmableListingsForSeller,
} from "@/lib/listing-availability-admin";

export const dynamic = "force-dynamic";

async function resolveSeller(
  token: string | null
): Promise<{ sellerId: string; batchId: string | null } | { error: string; status: number }> {
  const admin = createAdminClient();
  if (token) {
    const payload = verifyAvailabilityToken(token);
    if (!payload) return { error: "This confirmation link is invalid or has expired", status: 400 };
    const { data: batch } = await admin
      .from("listing_availability_batches")
      .select("id, seller_id")
      .eq("id", payload.batchId)
      .maybeSingle();
    if (!batch || batch.seller_id !== payload.sellerId) {
      return { error: "This confirmation link is invalid or has expired", status: 400 };
    }
    return { sellerId: batch.seller_id, batchId: batch.id };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  return { sellerId: user.id, batchId: null };
}

/**
 * GET /api/listings/confirm-availability
 * Token query or logged-in seller.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const resolved = await resolveSeller(token);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const admin = createAdminClient();
  const listings = await loadConfirmableListingsForSeller(
    admin,
    resolved.sellerId,
    resolved.batchId
  );
  return NextResponse.json({ listings });
}

/**
 * POST /api/listings/confirm-availability
 * Body: { token?: string, responses: { listingId: string, available: boolean }[] }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  const resolved = await resolveSeller(token);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const responses = Array.isArray(body.responses)
    ? body.responses
        .filter(
          (row: unknown) =>
            row &&
            typeof row === "object" &&
            typeof (row as { listingId?: unknown }).listingId === "string" &&
            typeof (row as { available?: unknown }).available === "boolean"
        )
        .map((row: { listingId: string; available: boolean }) => ({
          listingId: row.listingId,
          available: row.available,
        }))
    : [];
  if (responses.length === 0) {
    return NextResponse.json({ error: "Tell us whether each item is still available" }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    const result = await applySellerAvailabilityResponses(admin, {
      sellerId: resolved.sellerId,
      responses,
    });
    const remaining = await loadConfirmableListingsForSeller(
      admin,
      resolved.sellerId,
      resolved.batchId
    );
    return NextResponse.json({ ok: true, ...result, listings: remaining });
  } catch (e) {
    console.error("confirm availability failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save" },
      { status: 500 }
    );
  }
}
