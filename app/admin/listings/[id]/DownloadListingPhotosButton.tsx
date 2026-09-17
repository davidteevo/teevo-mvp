"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function DownloadListingPhotosButton({
  listingId,
  photoCount,
}: {
  listingId: string;
  photoCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (photoCount <= 0) return null;

  const onDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/photos/download`);
      if (!res.ok) {
        let message = "Could not download photos.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* ignore */
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? `listing-${listingId.slice(0, 8)}-photos.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download photos.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-mowing-green/40 text-mowing-green px-3 py-1.5 text-xs font-medium hover:bg-mowing-green/10 disabled:opacity-60"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {busy ? "Preparing zip…" : `Download all photos (${photoCount})`}
      </button>
      {error && (
        <p className="text-xs text-divot-pink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
