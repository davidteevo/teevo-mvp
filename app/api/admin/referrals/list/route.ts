import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/referral/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const { data, error } = await auth.admin
      .from("referrals")
      .select(
        "id, referrer_user_id, referred_user_id, creator_id, source, attributed_at, created_at, referral_code_id"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.flatMap((r) => [r.referrer_user_id, r.referred_user_id])));
    const { data: users } = userIds.length
      ? await auth.admin.from("users").select("id, email, display_name, first_name").in("id", userIds)
      : { data: [] as { id: string; email: string; display_name: string | null; first_name: string | null }[] };
    const userMap = new Map((users ?? []).map((u) => [u.id, u]));
    const referralIds = rows.map((r) => r.id);
    const { data: rewards } = referralIds.length
      ? await auth.admin
          .from("referral_rewards")
          .select("id, referral_id, reward_type, amount_pence, status")
          .in("referral_id", referralIds)
      : { data: [] as { id: string; referral_id: string; reward_type: string; amount_pence: number; status: string }[] };
    const rewardsByRef = new Map<string, typeof rewards>();
    for (const rw of rewards ?? []) {
      const list = rewardsByRef.get(rw.referral_id) ?? [];
      list.push(rw);
      rewardsByRef.set(rw.referral_id, list);
    }

    const mapped = rows.map((r) => {
      const referrer = userMap.get(r.referrer_user_id);
      const referred = userMap.get(r.referred_user_id);
      return {
        id: r.id,
        source: r.source,
        createdAt: r.created_at,
        referrer: {
          id: r.referrer_user_id,
          email: referrer?.email,
          display_name: referrer?.display_name,
        },
        referred: {
          id: r.referred_user_id,
          email: referred?.email,
          display_name: referred?.display_name,
        },
        creatorId: r.creator_id,
        referralCodeId: r.referral_code_id,
        rewards: rewardsByRef.get(r.id) ?? [],
      };
    });
    const filtered = q
      ? mapped.filter((row) => {
          const hay = `${row.referrer.email ?? ""} ${row.referred.email ?? ""} ${row.id}`.toLowerCase();
          return hay.includes(q.toLowerCase());
        })
      : mapped;
    return NextResponse.json({ referrals: filtered });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
