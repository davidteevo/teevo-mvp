import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fullSelect = "id, email, role, avatar_path, display_name, first_name, surname, location, handicap, handed, address_line1, address_line2, address_city, address_postcode, address_country, date_of_birth, created_at, updated_at";
  let { data: profile, error } = await supabase
    .from("users")
    .select(fullSelect)
    .eq("id", user.id)
    .single();

  if (error && error.message?.includes("column") && error.message?.includes("does not exist")) {
    const coreSelect = "id, email, role, avatar_path, display_name, first_name, surname, location, handicap, handed, created_at, updated_at";
    const result = await supabase.from("users").select(coreSelect).eq("id", user.id).single();
    error = result.error;
    profile = result.data ? { ...result.data, address_line1: null, address_line2: null, address_city: null, address_postcode: null, address_country: null, date_of_birth: null } : null;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.display_name === "string") {
    updates.display_name = body.display_name.trim() || null;
  }
  if (typeof body.first_name === "string") {
    updates.first_name = body.first_name.trim() || null;
  }
  if (typeof body.surname === "string") {
    updates.surname = body.surname.trim() || null;
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

  let { error } = await supabase.from("users").update(updates).eq("id", user.id);

  // If update failed due to missing columns (e.g. migration not run), save core fields only
  if (error && (error.message?.includes("column") && error.message?.includes("does not exist"))) {
    const coreUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.display_name === "string") coreUpdates.display_name = body.display_name.trim() || null;
    if (typeof body.first_name === "string") coreUpdates.first_name = body.first_name.trim() || null;
    if (typeof body.surname === "string") coreUpdates.surname = body.surname.trim() || null;
    if (typeof body.location === "string") coreUpdates.location = body.location.trim() || null;
    if (body.handed === "left" || body.handed === "right") coreUpdates.handed = body.handed;
    else if (body.handed === null || body.handed === "") coreUpdates.handed = null;
    if (body.handicap === null || body.handicap === "") coreUpdates.handicap = null;
    else if (typeof body.handicap === "number" && body.handicap >= 0 && body.handicap <= 54) coreUpdates.handicap = body.handicap;
    else if (typeof body.handicap === "string") {
      const n = parseInt(body.handicap, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 54) coreUpdates.handicap = n;
      if (body.handicap.trim() === "") coreUpdates.handicap = null;
    }
    const result = await supabase.from("users").update(coreUpdates).eq("id", user.id);
    error = result.error;
    if (!error) {
      return NextResponse.json({
        ok: true,
        warning: "Address and date of birth were not saved. Run the database migration to enable them.",
      });
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
