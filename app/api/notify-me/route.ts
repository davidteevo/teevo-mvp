import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/notify-me
 * Body: { listingId: string, email?: string }
 * When buying is disabled, captures buyer interest. If user is logged in, email is optional (uses account email).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json().catch(() => ({}));
  const listingId = body.listingId;
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const emailFromBody = typeof body.email === "string" ? body.email.trim() : undefined;
  const email = emailFromBody || user?.email?.trim();
  if (!email) {
    return NextResponse.json(
      { error: "Please enter your email, or log in so we can use your account email." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: listing, error: listErr } = await admin
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .is("archived_at", null)
    .single();

  if (listErr || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.status !== "verified") {
    return NextResponse.json({ error: "This listing is not available" }, { status: 400 });
  }

  const { error: insertErr } = await admin.from("buyer_notify_me").insert({
    listing_id: listingId,
    email,
    user_id: user?.id ?? null,
  });

  if (insertErr) {
    console.error("notify-me insert failed", insertErr);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Thanks — we'll email you when buying opens." });
}
