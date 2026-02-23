import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ensureEmailSent, EmailTriggerType, formatGbp } from "@/lib/email-triggers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://app.teevohq.com";

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

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tx } = await admin
    .from("transactions")
    .select("buyer_id, seller_id, listing_id, amount, status")
    .eq("id", id)
    .single();

  if (!tx || tx.buyer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tx.status !== "shipped") {
    return NextResponse.json({ error: "Can only confirm after shipped" }, { status: 400 });
  }

  const { error } = await admin
    .from("transactions")
    .update({
      status: "complete",
      order_state: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: seller } = await admin.from("users").select("email").eq("id", tx.seller_id).single();
  const { data: listing } = await admin.from("listings").select("brand, model").eq("id", tx.listing_id).single();
  const itemName = listing ? `${listing.brand} ${listing.model}` : "Item";
  const amountGbp = formatGbp(tx.amount);
  if (seller?.email) {
    await ensureEmailSent(admin, {
      emailType: EmailTriggerType.FUNDS_RELEASED,
      referenceId: id,
      recipientId: tx.seller_id,
      to: seller.email,
      subject: `Funds released – £${amountGbp}`,
      type: "transactional",
      variables: {
        title: "Funds released",
        subtitle: "Delivery was confirmed. Funds have been released to your payout account.",
        body: `Order #${id.slice(0, 8)} · ${itemName} · £${amountGbp}`,
        order_number: id.slice(0, 8),
        cta_link: `${appUrl}/dashboard/sales`,
        cta_text: "View sales",
      },
    }).catch((e) => console.error("Funds released email failed", e));
  }
  return NextResponse.json({ ok: true });
}
