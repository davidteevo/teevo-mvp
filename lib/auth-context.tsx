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
  updateProfile: (updates: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Suppress stray AbortError from showing as unhandled runtime error (e.g. fetch/nav edge cases)
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const e = event.reason;
    const msg = e instanceof Error ? e.message.toLowerCase() : "";
    if (
      (e as Error)?.name === "AbortError" ||
      msg.includes("aborted") ||
      msg.includes("signal is aborted")
    ) {
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

  /** Ensure users row exists, then load profile from API and client in parallel. */
  const ensureUserAndRefreshProfile = useCallback(async () => {
    try {
      await fetch("/api/auth/sync-user", { method: "POST", credentials: "include" });
      const [apiRes] = await Promise.all([
        fetch("/api/user/profile", { credentials: "include" }),
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

  /** Profile-only fetch (no sync, no client getUser) to avoid token refresh burst on retries. */
  const fetchProfileFromApiOnly = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data.profile?.id) setProfile(data.profile as AppUser);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") throw e;
    }
  }, []);

  useEffect(() => {
    const logAuth = (hypothesisId: string, location: string, message: string, data?: Record<string, unknown>) => {
      // #region agent log
      const names =
        typeof document !== "undefined"
          ? document.cookie
              .split(";")
              .map((c) => c.trim().split("=")[0])
              .filter((n) => n.startsWith("sb-"))
          : [];
      const body = JSON.stringify({
        sessionId: "f84ace",
        timestamp: Date.now(),
        runId: "auth-provider",
        hypothesisId,
        location,
        message,
        data: {
          host: typeof window !== "undefined" ? window.location.host : null,
          path: typeof window !== "undefined" ? window.location.pathname : null,
          cookieDomainEnv: process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? null,
          appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? null,
          names,
          count: names.length,
          ...(data ?? {}),
        },
      });
      fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f84ace" },
        body,
      }).catch(() => {});
      fetch("/api/debug-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
      // #endregion
    };

    let lastSignedOutLog = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // #region agent log
      if (event === "SIGNED_OUT") {
        const now = Date.now();
        if (now - lastSignedOutLog > 5000) {
          lastSignedOutLog = now;
          logAuth("H3", "auth-context.tsx:onAuthStateChange", "auth state change", {
            event,
            hasSession: Boolean(session),
            userId: session?.user?.id?.slice(0, 8) ?? null,
          });
        }
      } else {
        logAuth("H3", "auth-context.tsx:onAuthStateChange", "auth state change", {
          event,
          hasSession: Boolean(session),
          userId: session?.user?.id?.slice(0, 8) ?? null,
        });
      }
      // #endregion
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
      // #region agent log
      logAuth("H3", "auth-context.tsx:getUser", "initial getUser result", {
        hasUser: Boolean(u),
        userId: u?.id?.slice(0, 8) ?? null,
      });
      // #endregion
      setUser(u ?? null);
      if (u) {
        fetchProfile(u.id).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((e) => {
      // #region agent log
      logAuth("H3", "auth-context.tsx:getUser-catch", "initial getUser failed", {
        errName: e instanceof Error ? e.message.slice(0, 120) : "unknown",
      });
      // #endregion
      if ((e as Error)?.name !== "AbortError" && !cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Single retry when we have user but no profile (e.g. after login). One full run to avoid token refresh burst.
  useEffect(() => {
    if (!user || profile !== null || loading) return;
    const t = window.setTimeout(() => {
      ensureUserAndRefreshProfile();
    }, 400);
    return () => window.clearTimeout(t);
  }, [user, profile, loading, ensureUserAndRefreshProfile]);

  // Second attempt: profile API only (no sync, no client getUser) to limit /token calls if first run didn't get profile
  useEffect(() => {
    if (!user || profile !== null || loading) return;
    const t = window.setTimeout(() => {
      fetchProfileFromApiOnly();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [user, profile, loading, fetchProfileFromApiOnly]);

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

  const updateProfile = useCallback((updates: Partial<AppUser>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signOut,
        refreshProfile,
        updateProfile,
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
