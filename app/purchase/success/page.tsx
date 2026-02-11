import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function PurchaseSuccessPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-par-3-punch" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-mowing-green">
        Payment successful
      </h1>
      <p className="mt-2 text-mowing-green/80">
        The seller will be notified. Once they mark the item as shipped, you can confirm receipt in your dashboard to release payment.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/dashboard/purchases"
          className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-medium hover:opacity-90"
        >
          My purchases
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-mowing-green text-mowing-green px-6 py-3 font-medium hover:bg-mowing-green/5"
        >
          Browse more
        </Link>
      </div>
    </div>
  );
}
