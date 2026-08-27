"use client";

type Props = {
  visits: number;
  joined: number;
  listed: number;
  transacted: number;
  insight: string | null;
};

function FunnelStep({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-mowing-green">{value}</p>
      <p className="mt-1 text-sm text-mowing-green/70">{label}</p>
    </div>
  );
}

export function CreatorFunnel({ visits, joined, listed, transacted, insight }: Props) {
  return (
    <section className="rounded-2xl border border-par-3-punch/20 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-mowing-green">This month</h2>
      <div className="mt-5 flex flex-col items-center gap-2">
        <FunnelStep value={visits} label="Link visits" />
        <span className="text-par-3-punch" aria-hidden>
          ↓
        </span>
        <FunnelStep value={joined} label="Joined Teevo" />
        <span className="text-par-3-punch" aria-hidden>
          ↓
        </span>
        <FunnelStep value={listed} label="Listed" />
        <span className="text-par-3-punch" aria-hidden>
          ↓
        </span>
        <FunnelStep value={transacted} label="Transacted" />
      </div>
      {insight && (
        <p className="mt-5 rounded-xl bg-par-3-punch/10 px-4 py-3 text-sm font-medium text-mowing-green">
          <span aria-hidden>💡 </span>
          {insight}
        </p>
      )}
    </section>
  );
}
