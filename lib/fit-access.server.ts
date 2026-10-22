import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessTeevoFit } from "@/lib/fit-access";

/**
 * Server-enforced Teevo Fit access. Fail closed on any lookup error.
 * Role is read with the service role so the visitor cannot spoof it.
 */
export async function viewerCanAccessTeevoFit(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return false;
    return canAccessTeevoFit(profile?.role);
  } catch {
    return false;
  }
}
