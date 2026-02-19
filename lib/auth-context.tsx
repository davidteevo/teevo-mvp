"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { User as AppUser, UserRole } from "@/types/database";

interface AuthContextValue {
  user: SupabaseUser | null;
  profile: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Suppress AbortError from showing as unhandled runtime error (e.g. when navigating away during auth)
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const e = event.reason;
    if ((e as Error)?.name === "AbortError" || (e instanceof Error && e.message?.includes("aborted"))) {
      event.preventDefault();
    }
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data as AppUser | null);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") throw e;
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) await fetchProfile(u.id);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") throw e;
    }
  }, [supabase, fetchProfile]);

  /** Ensure users row exists, then load profile from API and client in parallel (faster; API works when cookie not sent to Supabase). */
  const ensureUserAndRefreshProfile = useCallback(async () => {
    try {
      await fetch("/api/auth/sync-user", { method: "POST" });
      // Run both: API (reliable on our origin) and client fetch; use whichever returns first
      const [apiRes] = await Promise.all([
        fetch("/api/user/profile"),
        refreshProfile(),
      ]);
      if (apiRes.ok) {
        const data = await apiRes.json().catch(() => ({}));
        if (data.profile && data.profile.id) {
          setProfile(data.profile as AppUser);
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") throw e;
    }
  }, [refreshProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          await fetchProfile(session.user.id);
        } catch (e) {
          if ((e as Error)?.name !== "AbortError") throw e;
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 10000);

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (cancelled) return;
      setUser(u ?? null);
      if (u) {
        fetchProfile(u.id).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((e) => {
      if ((e as Error)?.name !== "AbortError" && !cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Retry when we have user but no profile: ensure users row exists then fetch (e.g. app.teevohq.com after login)
  useEffect(() => {
    if (!user || profile !== null || loading) return;
    const t = window.setTimeout(() => {
      ensureUserAndRefreshProfile();
    }, 200);
    return () => window.clearTimeout(t);
  }, [user, profile, loading, ensureUserAndRefreshProfile]);

  // Second retry if profile still missing (e.g. cookies/session not ready)
  useEffect(() => {
    if (!user || profile !== null || loading) return;
    const t = window.setTimeout(() => {
      ensureUserAndRefreshProfile();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [user, profile, loading, ensureUserAndRefreshProfile]);

  const signOut = useCallback(async () => {
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore
    }
    // Full redirect to server route so cookies are cleared; middleware skips session refresh for this path
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/signout";
    }
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
