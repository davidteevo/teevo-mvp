import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = [
  "seller_landing_view",
  "seller_cta_click",
  "seller_signup_complete",
  "seller_listing_started",
  "seller_listing_completed",
  "seller_listing_photo_upload",
  "seller_listing_published",
  "seller_joined_whatsapp",
] as const;

export type AllowedEventName = (typeof ALLOWED_EVENTS)[number];

function isAllowedName(name: unknown): name is AllowedEventName {
  return typeof name === "string" && ALLOWED_EVENTS.includes(name as AllowedEventName);
}

/**
 * POST /api/events
 * Body: { name: string, properties?: object }
 * Tracks event for funnel analysis. name must be in allowlist.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let body: { name?: unknown; properties?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = body.name;
    if (!isAllowedName(name)) {
      return NextResponse.json(
        { error: "Invalid or disallowed event name" },
        { status: 400 }
      );
    }

    const properties =
      body.properties && typeof body.properties === "object" && !Array.isArray(body.properties)
        ? (body.properties as Record<string, unknown>)
        : {};

    const admin = createAdminClient();
    const { error } = await admin.from("events").insert({
      name,
      user_id: user?.id ?? null,
      properties,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
