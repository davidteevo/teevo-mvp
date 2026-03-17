"use client";

import { useEffect } from "react";

/**
 * Supabase redirects here with tokens in the hash. We immediately redirect to
 * /login/reset-password with the same params in the query string so tokens
 * survive email-client redirects or refreshes that might strip the fragment.
 */
export default function ResetPasswordCallbackPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (hash) {
      window.location.replace("/login/reset-password?" + hash);
    } else {
      window.location.replace("/login/reset-password");
    }
  }, []);

  return (
    <div className="max-w-sm mx-auto px-4 py-12 text-center text-mowing-green/80">
      Redirecting…
    </div>
  );
}
