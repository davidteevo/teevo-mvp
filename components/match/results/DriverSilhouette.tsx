/** Branded fallback. Not a photograph of a specific driver model. */
export function DriverSilhouette() {
  return (
    <div
      className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-2xl bg-mowing-green/[0.06]"
      aria-hidden="true"
    >
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <path
          className="stroke-mowing-green"
          d="M14 58 L38 30"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          className="fill-par-3-punch stroke-mowing-green"
          d="M34 18c8-7 22-6 26 2 4 8 1 16-8 20-10 4-22 1-26-6-3-6 0-12 8-16Z"
          strokeWidth="2"
        />
        <path
          className="stroke-mowing-green"
          d="M40 22c6 2 10 6 12 12"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
