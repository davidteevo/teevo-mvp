import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  BUYING_EVENTS,
  isBuyingEnabled,
  setBuyingEnabled,
} from "@/lib/buying";
import { trackServerEvent } from "@/lib/starter-pack";

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
 * GET /api/admin/settings/buying
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const enabled = await isBuyingEnabled(auth.admin);
    return NextResponse.json({ buying_enabled: enabled });
  } catch (e) {
    console.error("Get buying setting error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings/buying
 * Body: { buying_enabled: boolean }
 * Blocks new checkouts and transactional offers when false. Existing paid orders are unchanged.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    let body: { buying_enabled?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.buying_enabled !== "boolean") {
      return NextResponse.json({ error: "buying_enabled must be a boolean" }, { status: 400 });
    }

    const enabled = body.buying_enabled;
    const previous = await isBuyingEnabled(auth.admin);
    await setBuyingEnabled(auth.admin, enabled);

    if (previous !== enabled) {
      await trackServerEvent(auth.admin, enabled ? BUYING_EVENTS.ENABLED : BUYING_EVENTS.DISABLED, {
        userId: auth.user.id,
        properties: { previous, next: enabled },
      });
    }

    return NextResponse.json({ buying_enabled: enabled });
  } catch (e) {
    console.error("Patch buying setting error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
