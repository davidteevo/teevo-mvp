import { NextResponse, type NextRequest } from "next/server";

const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

/**
 * POST /api/auth/clear-session-cookies
 * Clears host-only and domain-scoped sb-* cookies without redirect.
 * Used before login when a stale cookie can leave the client in SIGNED_OUT limbo.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const baseClear: Record<string, unknown> = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
  };

  const sbNames = new Set<string>();
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-")) sbNames.add(name);
  }
  // Always try the known project cookie name pattern in case getAll is incomplete.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    const host = new URL(supabaseUrl).hostname.split(".")[0];
    if (host) {
      sbNames.add(`sb-${host}-auth-token`);
      sbNames.add(`sb-${host}-auth-token-code-verifier`);
    }
  } catch {
    // ignore
  }

  sbNames.forEach((name) => {
    response.cookies.set(name, "", { ...baseClear });
    if (cookieDomain) {
      response.cookies.set(name, "", { ...baseClear, domain: cookieDomain });
    }
  });

  // #region agent log
  try {
    const line = JSON.stringify({
      sessionId: "f84ace",
      timestamp: Date.now(),
      runId: "clear-cookies",
      hypothesisId: "H1",
      location: "api/auth/clear-session-cookies",
      message: "cleared sb cookies before login",
      data: {
        cleared: Array.from(sbNames),
        cookieDomain: cookieDomain ?? null,
        host: request.headers.get("host"),
      },
    });
    const { appendFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const logPath = path.join(process.cwd(), ".cursor", "debug-f84ace.log");
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, line + "\n");
  } catch {
    // ignore
  }
  // #endregion

  return response;
}
