import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const ACCOUNT_SUSPENDED_MESSAGE =
  "This account is suspended and cannot use marketplace buying or selling.";

export async function getAccountStatus(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await admin.from("users").select("account_status").eq("id", userId).maybeSingle();
  return (data?.account_status as string | undefined) ?? null;
}

export async function assertUserNotSuspended(
  admin: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const status = await getAccountStatus(admin, userId);
  if (status === "suspended") {
    return NextResponse.json({ error: ACCOUNT_SUSPENDED_MESSAGE }, { status: 403 });
  }
  return null;
}
