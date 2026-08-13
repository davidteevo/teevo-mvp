import { NextResponse } from "next/server";
import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { isProduction } from "@/lib/app-env";

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug-f84ace.log");

export async function POST(request: Request) {
  if (isProduction()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const line = JSON.stringify({ ...body, timestamp: body.timestamp ?? Date.now() }) + "\n";

    // Local/dev: persist NDJSON. Staging serverless: file write may fail; still return ok.
    try {
      await mkdir(path.dirname(LOG_PATH), { recursive: true });
      await appendFile(LOG_PATH, line);
    } catch {
      // ignore ephemeral FS failures on Netlify
    }

    return NextResponse.json({
      ok: true,
      overflowPx: body?.data?.overflowPx ?? null,
      received: true,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
