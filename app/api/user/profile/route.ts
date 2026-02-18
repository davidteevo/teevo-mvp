import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, role, avatar_path, display_name, location, handicap, handed, address_line1, address_line2, address_city, address_postcode, address_country, date_of_birth, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.display_name === "string") {
    updates.display_name = body.display_name.trim() || null;
  }
  if (typeof body.location === "string") {
    updates.location = body.location.trim() || null;
  }
  if (body.handed === "left" || body.handed === "right") {
    updates.handed = body.handed;
  } else if (body.handed === null || body.handed === "") {
    updates.handed = null;
  }
  if (body.handicap === null || body.handicap === "") {
    updates.handicap = null;
  } else if (typeof body.handicap === "number" && body.handicap >= 0 && body.handicap <= 54) {
    updates.handicap = body.handicap;
  } else if (typeof body.handicap === "string") {
    const n = parseInt(body.handicap, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 54) updates.handicap = n;
    if (body.handicap.trim() === "") updates.handicap = null;
  }

  const addressFields = ["address_line1", "address_line2", "address_city", "address_postcode", "address_country"] as const;
  for (const key of addressFields) {
    if (typeof body[key] === "string") {
      updates[key] = body[key].trim() || null;
    }
  }
  if (typeof body.date_of_birth === "string") {
    const trimmed = body.date_of_birth.trim();
    if (trimmed === "") {
      updates.date_of_birth = null;
    } else {
      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) updates.date_of_birth = trimmed;
    }
  } else if (body.date_of_birth === null) {
    updates.date_of_birth = null;
  }

  const { error } = await supabase.from("users").update(updates).eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
