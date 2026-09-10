import { NextResponse } from "next/server";
import {
  enrolUserAsCreator,
  setCreatorProgrammeStatus,
} from "@/lib/creator/admin-enrol";
import {
  getCreatorAdminInsightsByUserId,
  parseCreatorInsightsRange,
} from "@/lib/creator/admin-insights";
import { requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const { data: user } = await auth.admin.from("users").select("id").eq("id", id).maybeSingle();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const range = parseCreatorInsightsRange({
      preset: searchParams.get("preset") ?? "30d",
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    const insights = await getCreatorAdminInsightsByUserId(auth.admin, id, range);
    return NextResponse.json(insights);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load creator insights" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;

    let body: { name?: string; code?: string; notes?: string | null } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await enrolUserAsCreator(auth.admin, {
      userId: id,
      adminId: auth.user.id,
      name: body.name,
      code: body.code,
      notes: body.notes,
      sendOnboardingEmail: true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      creatorId: result.creatorId,
      code: result.code,
      reactivated: result.reactivated,
      onboardingEmail: result.onboardingEmail,
      warning: result.warning,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to enrol creator" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;

    let body: { action?: "remove" | "reactivate" };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { data: creator } = await auth.admin
      .from("creators")
      .select("id, status")
      .eq("user_id", id)
      .maybeSingle();
    if (!creator) {
      return NextResponse.json({ error: "User is not a creator" }, { status: 404 });
    }

    if (body.action === "remove") {
      const result = await setCreatorProgrammeStatus(auth.admin, {
        creatorId: creator.id,
        status: "disabled",
        adminId: auth.user.id,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true, status: "disabled" });
    }

    if (body.action === "reactivate") {
      // Prefer enrol helper so onboarding email + code enable run together.
      const result = await enrolUserAsCreator(auth.admin, {
        userId: id,
        adminId: auth.user.id,
        sendOnboardingEmail: true,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        ok: true,
        status: "active",
        reactivated: result.reactivated,
        onboardingEmail: result.onboardingEmail,
        warning: result.warning,
      });
    }

    return NextResponse.json(
      { error: "action must be 'remove' or 'reactivate'" },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update creator" },
      { status: 500 }
    );
  }
}
