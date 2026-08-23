"use client";

import { useEffect } from "react";

export default function AdminUsersError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7581/ingest/4c9de01a-e4bd-4cc4-acce-f5ab7832ce40", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f61061" },
      body: JSON.stringify({
        sessionId: "f61061",
        hypothesisId: "A,D,E",
        location: "app/admin/users/error.tsx",
        message: error.message,
        data: {
          name: error.name,
          digest: error.digest ?? null,
          stack: error.stack?.slice(0, 2000) ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [error]);

  return (
    <p className="text-mowing-green">
      Application error: a client-side exception has occurred (see the browser console for more information).
    </p>
  );
}
