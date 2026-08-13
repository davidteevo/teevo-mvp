import { NextResponse } from "next/server";
import { appendFile, mkdir } from "fs/promises";
import path from "path";

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug-f84ace.log");

type DebugPayload = Record<string, unknown>;

/** Best-effort ring buffer for serverless GET after reproduce (same instance). */
const recent: DebugPayload[] = [];
const MAX = 40;

function pushRecent(entry: DebugPayload) {
  recent.push(entry);
  if (recent.length > MAX) recent.shift();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DebugPayload;
    const entry = {
      ...body,
      sessionId: "f84ace",
      timestamp: typeof body.timestamp === "number" ? body.timestamp : Date.now(),
      serverHost: request.headers.get("host"),
    };
    pushRecent(entry);
    try {
      await mkdir(path.dirname(LOG_PATH), { recursive: true });
      await appendFile(LOG_PATH, JSON.stringify(entry) + "\n");
    } catch {
      // serverless FS may be read-only
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET() {
  const supabaseHost = (() => {
    try {
      const u = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      return u ? new URL(u).host : null;
    } catch {
      return null;
    }
  })();
  return NextResponse.json({
    ok: true,
    config: {
      appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? null,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? null,
      cookieDomainSet: Boolean(process.env.NEXT_PUBLIC_COOKIE_DOMAIN),
      supabaseHost,
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("eyJ")),
    },
    recent,
  });
}
