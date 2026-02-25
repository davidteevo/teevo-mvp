import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { PackagingStatus } from "@/lib/fulfilment";

const DEBUG_LOG_PATH = join(process.cwd(), ".cursor", "debug-1a0940.log");

export const dynamic = "force-dynamic";

const BUCKET = "packaging-photos";
const EXPIRY_SEC = 3600;

/**
 * GET /api/admin/packaging-pending
 * Returns transactions with packaging_status = SUBMITTED and signed photo URLs. Admin only (users.role = 'admin').
 */
export async function GET(request: NextRequest) {
  try {
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

    // #region agent log
    const _logEarly = (message: string, data: Record<string, unknown>) => {
      const line = JSON.stringify({ sessionId: "1a0940", location: "packaging-pending/route.ts", message, data, timestamp: Date.now() }) + "\n";
      try {
        mkdirSync(join(process.cwd(), ".cursor"), { recursive: true });
        appendFileSync(DEBUG_LOG_PATH, line);
      } catch (_) {}
    };
    _logEarly("packaging-pending GET entered", { admin: true });
    // #endregion

    const { data: rows, error } = await admin
      .from("transactions")
      .select(
        "id, listing_id, created_at, packaging_photos, listing:listings(model, category, brand)"
      )
      .eq("packaging_status", PackagingStatus.SUBMITTED)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // #region agent log
    const _log = (message: string, data: Record<string, unknown>) => {
      const line = JSON.stringify({ sessionId: "1a0940", location: "packaging-pending/route.ts", message, data, timestamp: Date.now() }) + "\n";
      try {
        mkdirSync(join(process.cwd(), ".cursor"), { recursive: true });
        appendFileSync(DEBUG_LOG_PATH, line);
      } catch (_) {}
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1a0940" },
        body: JSON.stringify({ sessionId: "1a0940", location: "packaging-pending/route.ts", message, data, timestamp: Date.now() }),
      }).catch(() => {});
    };
    _log("packaging-pending query result", {
      rowCount: rows?.length ?? 0,
      firstRowId: rows?.[0] ? (rows[0] as { id?: string }).id : null,
      firstRowPackagingPhotos: rows?.[0] ? (rows[0] as { packaging_photos?: unknown }).packaging_photos : null,
      firstRowPackagingStatus: rows?.[0] ? (rows[0] as { packaging_status?: string }).packaging_status : null,
    });
    // #endregion

    const bucket = admin.storage.from(BUCKET);
    const withUrls = await Promise.all(
      (rows ?? []).map(async (tx: { id: string; listing_id: string; packaging_photos?: string[]; listing?: unknown; created_at: string }) => {
        const rawPaths = Array.isArray(tx.packaging_photos) ? tx.packaging_photos : [];
        const paths = rawPaths.map((p) => (typeof p === "string" && p.startsWith("/") ? p.slice(1) : p));
        const photoUrls: string[] = [];
        for (const path of paths) {
          if (!path || typeof path !== "string") continue;
          const { data: signData, error: signErr } = await bucket.createSignedUrl(path, EXPIRY_SEC);
          // #region agent log
          if (tx.id === (rows?.[0] as { id: string } | undefined)?.id && photoUrls.length === 0 && paths.length > 0) {
            _log("first signed url for first tx", {
              path: paths[0],
              hasSignedUrl: !!signData?.signedUrl,
              signError: signErr?.message ?? null,
              signDataKeys: signData ? Object.keys(signData) : [],
            });
          }
          // #endregion
          if (signData?.signedUrl) photoUrls.push(signData.signedUrl);
        }
        return {
          id: tx.id,
          listing_id: tx.listing_id,
          created_at: tx.created_at,
          listing: tx.listing,
          photoUrls,
        };
      })
    );

    // #region agent log
    _log("withUrls built", {
      count: withUrls.length,
      firstPhotoUrlsLength: withUrls[0]?.photoUrls?.length ?? 0,
    });
    // #endregion

    const resPayload: { transactions: typeof withUrls; _debug?: Record<string, unknown> } = { transactions: withUrls };
    const debugHeader = request.headers.get("X-Debug-Packaging");
    if (debugHeader === "1a0940") {
      const firstUrl = withUrls[0]?.photoUrls?.[0];
      resPayload._debug = {
        rowCount: rows?.length ?? 0,
        firstRowPackagingPhotos: rows?.[0] ? (rows[0] as { packaging_photos?: unknown }).packaging_photos : null,
        firstPhotoUrlsLength: withUrls[0]?.photoUrls?.length ?? 0,
        firstSignedUrlPrefix: firstUrl ? firstUrl.slice(0, 80) + "…" : null,
      };
    }
    return NextResponse.json(resPayload);
  } catch (e) {
    console.error("Admin packaging-pending error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
