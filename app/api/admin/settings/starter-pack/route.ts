import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  isFreeStarterPackEnabled,
  setFreeStarterPackEnabled,
  STARTER_PACK_EVENTS,
  trackServerEvent,
} from "@/lib/starter-pack";

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
 * GET /api/admin/settings/starter-pack
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const enabled = await isFreeStarterPackEnabled(auth.admin);
    return NextResponse.json({ free_starter_pack_enabled: enabled });
  } catch (e) {
    console.error("Get starter-pack setting error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings/starter-pack
 * Body: { free_starter_pack_enabled: boolean }
 * Affects new packaging decisions only.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    let body: { free_starter_pack_enabled?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.free_starter_pack_enabled !== "boolean") {
      return NextResponse.json(
        { error: "free_starter_pack_enabled must be a boolean" },
        { status: 400 }
      );
    }

    const enabled = body.free_starter_pack_enabled;
    const previous = await isFreeStarterPackEnabled(auth.admin);
    await setFreeStarterPackEnabled(auth.admin, enabled);

    if (previous !== enabled) {
      await trackServerEvent(auth.admin, enabled ? STARTER_PACK_EVENTS.ENABLED : STARTER_PACK_EVENTS.DISABLED, {
        userId: auth.user.id,
      });
    }

    return NextResponse.json({ free_starter_pack_enabled: enabled });
  } catch (e) {
    console.error("Patch starter-pack setting error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
