import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";
import {
  MATCH_EVENTS,
  isMatchEnabled,
  setMatchEnabled,
} from "@/lib/match-settings";
import { trackServerEvent } from "@/lib/starter-pack";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const enabled = await isMatchEnabled(auth.admin);
  return NextResponse.json({ fit_enabled: enabled });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: { fit_enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.fit_enabled !== "boolean") {
    return NextResponse.json({ error: "fit_enabled must be a boolean" }, { status: 400 });
  }

  const enabled = body.fit_enabled;
  const previous = await isMatchEnabled(auth.admin);
  await setMatchEnabled(auth.admin, enabled);

  if (previous !== enabled) {
    await trackServerEvent(auth.admin, enabled ? MATCH_EVENTS.ENABLED : MATCH_EVENTS.DISABLED, {
      userId: auth.user.id,
      properties: { previous, next: enabled },
    });
  }

  return NextResponse.json({ fit_enabled: enabled });
}
