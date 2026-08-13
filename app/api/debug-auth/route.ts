import { NextResponse } from "next/server";
import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug-f84ace.log");
const TMP_PATH = path.join(tmpdir(), "teevo-debug-auth-f84ace.json");

type DebugPayload = Record<string, unknown>;

const priority: DebugPayload[] = [];
const recent: DebugPayload[] = [];
const MAX_PRIORITY = 30;
const MAX_RECENT = 40;

function isPriority(entry: DebugPayload) {
  const runId = String(entry.runId ?? "");
  const location = String(entry.location ?? "");
  return (
    runId === "login-pre" ||
    runId === "login-bounce" ||
    runId === "dashboard-bounce" ||
    runId === "clear-cookies" ||
    runId === "post-fix" ||
    location.includes("login/page") ||
    location.includes("dashboard/page") ||
    location.includes("clear-session")
  );
}

function pushRecent(entry: DebugPayload) {
  if (isPriority(entry)) {
    priority.push(entry);
    if (priority.length > MAX_PRIORITY) priority.shift();
  } else {
    // Throttle identical SIGNED_OUT spam in the general buffer
    const last = recent[recent.length - 1];
    const sameSignedOut =
      last &&
      last.location === entry.location &&
      (last.data as { event?: string } | undefined)?.event === "SIGNED_OUT" &&
      (entry.data as { event?: string } | undefined)?.event === "SIGNED_OUT";
    if (sameSignedOut) return;
    recent.push(entry);
    if (recent.length > MAX_RECENT) recent.shift();
  }
}

async function persistTmp() {
  try {
    await writeFile(TMP_PATH, JSON.stringify({ priority, recent, updatedAt: Date.now() }));
  } catch {
    // ignore
  }
}

async function loadTmp(): Promise<{ priority: DebugPayload[]; recent: DebugPayload[] } | null> {
  try {
    const raw = await readFile(TMP_PATH, "utf8");
    return JSON.parse(raw) as { priority: DebugPayload[]; recent: DebugPayload[] };
  } catch {
    return null;
  }
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
    await persistTmp();
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
  const fromDisk = await loadTmp();
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
    priority: priority.length ? priority : fromDisk?.priority ?? [],
    recent: recent.length ? recent : fromDisk?.recent ?? [],
  });
}
