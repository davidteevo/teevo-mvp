import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sellers/lookup?email=...
 * POST /api/admin/sellers/lookup with body { email }
 * Admin-only. Returns { found: true, user: { id, email, first_name, surname } } or { found: false }.
 */
async function handleLookup(email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!trimmed) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("users")
    .select("id, email, first_name, surname")
    .ilike("email", trimmed)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ found: false });
  }
  return NextResponse.json({
    found: true,
    user: {
      id: existing.id,
      email: existing.email,
      first_name: existing.first_name,
      surname: existing.surname,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? "";
  return handleLookup(email);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = (body.email as string) ?? "";
  return handleLookup(email);
}
