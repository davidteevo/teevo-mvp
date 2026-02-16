export default function AdminLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-mowing-green/80">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-par-3-punch border-t-transparent" aria-hidden />
      <p className="mt-4 text-sm font-medium">Loading admin dashboard…</p>
    </div>
  );
}
