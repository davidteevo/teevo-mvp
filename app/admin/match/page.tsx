import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminMatchPage() {
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-par-3-punch">
        Internal preview · admin only
      </p>
      <h1 className="text-2xl font-semibold text-mowing-green">Teevo Match</h1>
      <p className="text-sm text-mowing-green/80">
        Checkpoint A: questionnaire and catalogue head suitability. Not a public
        feature. Recommendations are model-level only and are not purchase offers.
        Inventory attachment is Checkpoint B.
      </p>
      <Link
        href="/admin/match/questionnaire?fresh=1"
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-mowing-green px-5 text-sm font-semibold text-off-white-pique"
      >
        Start questionnaire
      </Link>
    </div>
  );
}
