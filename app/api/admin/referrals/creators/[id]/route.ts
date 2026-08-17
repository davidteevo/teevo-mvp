import { NextResponse } from "next/server";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";
import { disableReferralCode } from "@/lib/referral/codes";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;
    let body: {
      name?: string;
      userId?: string | null;
      socialHandle?: string | null;
      socialUrl?: string | null;
      commissionPence?: number;
      status?: "active" | "paused" | "disabled";
      notes?: string | null;
      disableCode?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { data: existing } = await auth.admin
      .from("creators")
      .select("id, referral_code_id, status")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (body.userId !== undefined) patch.user_id = body.userId || null;
    if (body.socialHandle !== undefined) patch.social_handle = body.socialHandle || null;
    if (body.socialUrl !== undefined) patch.social_url = body.socialUrl || null;
    if (typeof body.commissionPence === "number") {
      if (!Number.isInteger(body.commissionPence) || body.commissionPence < 0) {
        return NextResponse.json({ error: "Commission must be a non-negative integer (pence)" }, { status: 400 });
      }
      patch.commission_pence = body.commissionPence;
    }
    if (body.status === "active" || body.status === "paused" || body.status === "disabled") {
      patch.status = body.status;
    }
    if (body.notes !== undefined) patch.notes = body.notes;

    const { error } = await auth.admin.from("creators").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.disableCode || body.status === "disabled") {
      await disableReferralCode(auth.admin, existing.referral_code_id);
    }

    await logAdminAction(auth.admin, {
      adminId: auth.user.id,
      action: "update_creator",
      targetType: "creator",
      targetId: id,
      payload: body as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
