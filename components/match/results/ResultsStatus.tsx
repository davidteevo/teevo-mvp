import {
  RESULTS_EMPTY_LISTINGS_BODY,
  RESULTS_EMPTY_LISTINGS_TITLE,
  RESULTS_INVENTORY_UNAVAILABLE,
  RESULTS_LOADING_BODY,
  RESULTS_LOADING_TITLE,
  RESULTS_REFRESH_ERROR_BODY,
  RESULTS_REFRESH_ERROR_TITLE,
} from "@/lib/match/app/present-results-state";

export function ResultsLoading() {
  return (
    <div className="max-w-xl space-y-2" role="status" aria-live="polite">
      <h1 className="text-xl font-semibold text-mowing-green sm:text-2xl">
        {RESULTS_LOADING_TITLE}
      </h1>
      <p className="text-sm text-mowing-green/80">{RESULTS_LOADING_BODY}</p>
    </div>
  );
}

export function RefreshStatus({
  pending,
  failed,
  detail,
}: {
  pending: boolean;
  failed: boolean;
  detail?: string | null;
}) {
  if (failed) {
    return (
      <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-mowing-green" role="alert">
        <p className="font-semibold">{RESULTS_REFRESH_ERROR_TITLE}</p>
        <p className="mt-1 text-mowing-green/80">{RESULTS_REFRESH_ERROR_BODY}</p>
        {detail ? <p className="mt-1 text-red-700">{detail}</p> : null}
      </div>
    );
  }
  if (pending) {
    return (
      <p className="text-sm text-mowing-green/80" role="status">
        {RESULTS_LOADING_BODY}
      </p>
    );
  }
  return null;
}

export function ListingAvailabilityNotice({
  status,
  hasListings,
}: {
  status: "ready" | "unavailable";
  hasListings: boolean;
}) {
  if (status === "unavailable") {
    return (
      <div className="rounded-xl border border-mowing-green/15 bg-white px-4 py-3 text-sm text-mowing-green" role="status">
        <p>{RESULTS_INVENTORY_UNAVAILABLE}</p>
      </div>
    );
  }
  if (hasListings) return null;
  return (
    <div className="rounded-xl border border-mowing-green/15 bg-white px-4 py-3 text-sm text-mowing-green">
      <p className="font-semibold">{RESULTS_EMPTY_LISTINGS_TITLE}</p>
      <p className="mt-1 text-mowing-green/80">{RESULTS_EMPTY_LISTINGS_BODY}</p>
    </div>
  );
}
