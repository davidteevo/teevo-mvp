import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFounderCampaignSnapshot } from "@/lib/founder/campaign";
import {
  founderMilestoneMessage,
  founderProgressLabel,
  founderRemainingLabel,
  founderSocialProof,
} from "@/lib/founder/copy";

export const dynamic = "force-dynamic";

/**
 * GET /api/founder/campaign
 * Public campaign progress for homepage / signup.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const snapshot = await getFounderCampaignSnapshot(admin);
    return NextResponse.json({
      status: snapshot.status,
      claimed: snapshot.claimed,
      remaining: snapshot.remaining,
      limit: snapshot.limit,
      activated: snapshot.activated,
      progressLabel: founderProgressLabel(snapshot.claimed, snapshot.limit),
      remainingLabel: founderRemainingLabel(snapshot.claimed, snapshot.limit),
      milestoneMessage: founderMilestoneMessage(snapshot.claimed, snapshot.limit),
      socialProof: founderSocialProof(snapshot.claimed),
      active: snapshot.status === "active" && snapshot.remaining > 0,
    });
  } catch (e) {
    console.error("GET /api/founder/campaign", e);
    return NextResponse.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}
