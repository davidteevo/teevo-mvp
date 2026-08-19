import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { clearStripeAccountId } from "@/lib/stripe-account";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/:id/reset-stripe
 * Clears a stale stripe_account_id so the user can re-run Connect onboarding.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: target, error: fetchErr } = await admin
    .from("users")
    .select("id, email, stripe_account_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await clearStripeAccountId(admin, id);

  return NextResponse.json({
    ok: true,
    userId: target.id,
    email: target.email,
    previousStripeAccountId: target.stripe_account_id,
  });
}
