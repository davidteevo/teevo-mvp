import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/health - Debug server-side env and Supabase connectivity.
 * Returns the actual error message so you can see it in the browser or Netlify logs.
 */
export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is missing in this environment." },
        { status: 500 }
      );
    }
    if (!anonKey) {
      return NextResponse.json(
        { ok: false, error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in this environment." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("listings").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, error: `Supabase query failed: ${error.message} (code: ${error.code})` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[health] Server error:", message, stack);
    return NextResponse.json(
      { ok: false, error: message, stack: process.env.NODE_ENV === "development" ? stack : undefined },
      { status: 500 }
    );
  }
}
