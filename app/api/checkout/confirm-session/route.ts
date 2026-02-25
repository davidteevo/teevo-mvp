import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createTransactionAndSendEmails } from "@/lib/checkout-complete";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/confirm-session
 * Body: { session_id: string }
 *
 * Fallback when the Stripe webhook has not run (e.g. webhook URL not configured or delivery failed).
 * Called by the purchase success page with the checkout session_id from the URL.
 * Verifies the logged-in user is the buyer, then creates the transaction and sends emails if not already created.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sessionId = body.session_id ?? body.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Session not paid" }, { status: 400 });
  }

  const buyerId = session.metadata?.buyerId;
  if (buyerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await createTransactionAndSendEmails(admin, session);
    if ("transactionId" in result) {
      return NextResponse.json({ ok: true, transactionId: result.transactionId });
    }
    return NextResponse.json({ ok: true, alreadyExists: true });
  } catch (e) {
    console.error("Confirm session failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to confirm order" },
      { status: 500 }
    );
  }
}
