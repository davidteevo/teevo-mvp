import { NextResponse } from "next/server";
import { logAdminAction, requireAdmin } from "@/lib/referral/admin-auth";
import { cancelReward, markCreatorCommissionPaid, reverseApprovedReward } from "@/lib/referral/rewards";

export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  params: Promise<{ id: string }>,
  action: "cancel" | "reverse" | "paid"
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  let notes: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.notes === "string") notes = body.notes;
  } catch {
    notes = undefined;
  }

  let ok = false;
  if (action === "cancel") ok = await cancelReward(auth.admin, id, notes);
  if (action === "reverse") ok = await reverseApprovedReward(auth.admin, id, notes);
  if (action === "paid") ok = await markCreatorCommissionPaid(auth.admin, id);
  if (!ok) {
    return NextResponse.json({ error: "Could not update that reward." }, { status: 400 });
  }
  await logAdminAction(auth.admin, {
    adminId: auth.user.id,
    action: `referral_reward_${action}`,
    targetType: "referral_reward",
    targetId: id,
    payload: { notes: notes ?? null },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  if (action === "cancel" || action === "reverse" || action === "paid") {
    return handle(request, context.params, action);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
