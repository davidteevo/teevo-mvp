import Link from "next/link";
import { TrustStrip } from "./TrustStrip";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-par-3-punch/20 bg-off-white-pique">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-mowing-green/80">
            © {new Date().getFullYear()} Teevo. UK golf equipment marketplace.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="text-mowing-green/80 hover:text-mowing-green">
              Browse
            </Link>
            <Link href="/sell" className="text-mowing-green/80 hover:text-mowing-green">
              Sell
            </Link>
            <Link href="/dashboard" className="text-mowing-green/80 hover:text-mowing-green">
              Dashboard
            </Link>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-par-3-punch/10">
          <p className="text-xs text-mowing-green/60 text-center">
            Verified listings · Secure payment · UK only
          </p>
        </div>
      </div>
    </footer>
  );
}
