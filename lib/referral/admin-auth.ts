import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<
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

export async function logAdminAction(
  admin: ReturnType<typeof createAdminClient>,
  opts: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  await admin.from("admin_actions").insert({
    admin_id: opts.adminId,
    action: opts.action,
    target_type: opts.targetType,
    target_id: opts.targetId,
    payload: opts.payload ?? {},
  });
}
