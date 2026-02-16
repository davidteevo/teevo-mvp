import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);
    if (user) {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: existing } = await admin.from("users").select("id").eq("id", user.id).single();
      const updated_at = new Date().toISOString();
      if (existing) {
        await admin.from("users").update({ email: user.email ?? "", updated_at }).eq("id", user.id);
      } else {
        await admin.from("users").insert({
          id: user.id,
          email: user.email ?? "",
          role: "buyer",
          updated_at,
        });
      }
    }
  }
  return NextResponse.redirect(new URL(next, request.url));
}
