import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

type MatchedUser = {
  id: string;
  email: string;
  firstName: string | null;
  surname: string | null;
  displayName: string | null;
  accountStatus: string | null;
  alreadyCreator: boolean;
  creatorId: string | null;
  suggestedCreatorName: string;
};

function suggestedName(u: {
  first_name: string | null;
  surname: string | null;
  display_name: string | null;
  email: string | null;
}): string {
  const fromParts = [u.first_name, u.surname].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  if (u.display_name?.trim()) return u.display_name.trim();
  const local = (u.email ?? "").split("@")[0]?.trim();
  return local || "";
}

/**
 * GET /api/admin/referrals/creators/lookup?email=...
 * Admin-only. Finds Teevo users by email for the Add creator form.
 * - Full email → exact match (case-insensitive)
 * - Partial query (3+ chars) → up to 5 email suggestions
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const raw = (searchParams.get("email") ?? "").trim().toLowerCase();
    if (!raw) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const isFullEmail = raw.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);

    let users: {
      id: string;
      email: string | null;
      first_name: string | null;
      surname: string | null;
      display_name: string | null;
      account_status: string | null;
    }[] = [];

    if (isFullEmail) {
      const { data } = await auth.admin
        .from("users")
        .select("id, email, first_name, surname, display_name, account_status")
        .ilike("email", raw)
        .limit(1);
      users = data ?? [];
    } else if (raw.length >= 3) {
      const { data } = await auth.admin
        .from("users")
        .select("id, email, first_name, surname, display_name, account_status")
        .ilike("email", `%${raw}%`)
        .order("email", { ascending: true })
        .limit(5);
      users = data ?? [];
    } else {
      return NextResponse.json({ found: false, matches: [] as MatchedUser[] });
    }

    if (users.length === 0) {
      return NextResponse.json({
        found: false,
        matches: [] as MatchedUser[],
        message: isFullEmail
          ? "No Teevo user with this email. Creating will invite them as a new account."
          : null,
      });
    }

    const ids = users.map((u) => u.id);
    const { data: creatorRows } = await auth.admin
      .from("creators")
      .select("id, user_id")
      .in("user_id", ids);

    const creatorByUser = new Map<string, string>();
    for (const c of creatorRows ?? []) {
      if (c.user_id) creatorByUser.set(c.user_id, c.id);
    }

    const matches: MatchedUser[] = users.map((u) => {
      const creatorId = creatorByUser.get(u.id) ?? null;
      return {
        id: u.id,
        email: u.email ?? raw,
        firstName: u.first_name,
        surname: u.surname,
        displayName: u.display_name,
        accountStatus: u.account_status,
        alreadyCreator: Boolean(creatorId),
        creatorId,
        suggestedCreatorName: suggestedName(u),
      };
    });

    return NextResponse.json({
      found: matches.length > 0,
      matches,
      exact: isFullEmail ? matches[0] ?? null : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
