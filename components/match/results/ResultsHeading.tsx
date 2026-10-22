export function ResultsHeading() {
  return (
    <header className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-par-3-punch">
        Teevo Fit
      </p>
      <h1 className="text-xl font-semibold text-mowing-green sm:text-2xl">
        Your driver recommendations
      </h1>
      <p className="text-sm text-mowing-green/80">
        Models ranked using evidence-backed head characteristics, not price or
        release year.
      </p>
      <div className="rounded-xl bg-par-3-punch/10 px-4 py-3 text-sm text-mowing-green">
        <p className="font-semibold">Head-only assessment</p>
        <p className="mt-1 text-mowing-green/80">
          Shaft and loft are not included. Confirm the configuration on an
          actual listing.
        </p>
      </div>
    </header>
  );
}
