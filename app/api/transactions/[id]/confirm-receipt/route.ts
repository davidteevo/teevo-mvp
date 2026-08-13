import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { confirmBuyerReceipt } from "@/lib/confirm-receipt";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await confirmBuyerReceipt(admin, {
    transactionId: id,
    buyerUserId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!result.alreadyConfirmed) {
    await trackServerEvent(admin, "buyer_delivery_confirmed", {
      userId: user.id,
      properties: { entity_type: "transaction", entity_id: id },
    });
  }

  return NextResponse.json({ ok: true, already_confirmed: result.alreadyConfirmed });
}
