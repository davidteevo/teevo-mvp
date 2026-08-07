import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  FulfilmentMode,
  getPlatformFulfilmentMode,
  isFulfilmentMode,
  setPlatformFulfilmentMode,
  type FulfilmentModeType,
} from "@/lib/fulfilment-providers";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<
  | { error: NextResponse }
  | { admin: ReturnType<typeof createAdminClient>; user: { id: string } }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin, user };
}

/**
 * GET /api/admin/settings/fulfilment-mode
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const mode = await getPlatformFulfilmentMode(auth.admin);
    return NextResponse.json({ fulfilment_mode: mode });
  } catch (e) {
    console.error("Get fulfilment-mode error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings/fulfilment-mode
 * Body: { fulfilment_mode: "shippo" | "manual" }
 * Affects new orders only.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    let body: { fulfilment_mode?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isFulfilmentMode(body.fulfilment_mode)) {
      return NextResponse.json(
        { error: `fulfilment_mode must be "${FulfilmentMode.SHIPPO}" or "${FulfilmentMode.MANUAL}"` },
        { status: 400 }
      );
    }

    const mode = body.fulfilment_mode as FulfilmentModeType;
    await setPlatformFulfilmentMode(auth.admin, mode);
    return NextResponse.json({ fulfilment_mode: mode });
  } catch (e) {
    console.error("Patch fulfilment-mode error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
