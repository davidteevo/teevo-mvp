import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/health - Debug server-side env and Supabase connectivity.
 * Use on production (e.g. https://app.teevohq.com/api/health) to see why auth or listings might fail.
 * Returns which env vars are set and whether Supabase auth + admin (listings) work.
 */
export async function GET() {
  const hasSupabaseUrl = !!(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const diagnostics: Record<string, unknown> = {
    hasSupabaseUrl,
    hasAnonKey,
    hasServiceRoleKey,
    hint:
      "On Netlify, set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and trigger a new deploy so they are available at build and runtime.",
  };

  // #region agent log
  try {
    fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7a6302" },
      body: JSON.stringify({
        sessionId: "7a6302",
        location: "app/api/health/route.ts:diagnostics",
        message: "health diagnostics",
        data: diagnostics,
        hypothesisId: "H1",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch (_) {}
  // #endregion

  try {
    if (!hasSupabaseUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is missing. Set it in Netlify env vars and redeploy.",
          ...diagnostics,
        },
        { status: 500 }
      );
    }
    if (!hasAnonKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Set it in Netlify env vars and redeploy.",
          ...diagnostics,
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { error: authError } = await supabase.from("listings").select("id").limit(1);
    if (authError) {
      return NextResponse.json(
        {
          ok: false,
          authOk: false,
          error: `Supabase (session) query failed: ${authError.message}`,
          ...diagnostics,
        },
        { status: 500 }
      );
    }
    diagnostics.authOk = true;

    if (!hasServiceRoleKey) {
      return NextResponse.json({
        ok: true,
        ...diagnostics,
        listingsOk: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Listings will not load on the home page. Add it in Netlify env vars and redeploy.",
      });
    }

    try {
      const admin = createAdminClient();
      const { error: adminError } = await admin.from("listings").select("id").limit(1);
      if (adminError) {
        return NextResponse.json({
          ok: false,
          authOk: true,
          listingsOk: false,
          error: `Supabase (admin/listings) query failed: ${adminError.message}`,
          ...diagnostics,
        });
      }
      diagnostics.listingsOk = true;
    } catch (adminErr) {
      const msg = adminErr instanceof Error ? adminErr.message : String(adminErr);
      return NextResponse.json({
        ok: false,
        authOk: true,
        listingsOk: false,
        error: `Admin client failed: ${msg}. Ensure SUPABASE_SERVICE_ROLE_KEY is set in Netlify and redeploy.`,
        ...diagnostics,
      });
    }

    return NextResponse.json({ ok: true, ...diagnostics });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[health] Server error:", message, stack);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        ...diagnostics,
        stack: process.env.NODE_ENV === "development" ? stack : undefined,
      },
      { status: 500 }
    );
  }
}
