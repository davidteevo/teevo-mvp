"use client";

import { useEffect, useState } from "react";

/** Public read of the admin Teevo Fit switch. Fail closed while loading or on error. */
export function useTeevoFitEnabled(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fit/status")
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data) => {
        if (!cancelled) setEnabled(data?.enabled === true);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}
