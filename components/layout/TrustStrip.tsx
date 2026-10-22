import Image from "next/image";
import { Shield, Lock, MapPin } from "lucide-react";

export function TrustStrip() {
  return (
    <div className="bg-mowing-green text-off-white-pique py-1.5 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:gap-6 text-xs">
        <Image
          src="/logo-text-white.png"
          alt="Teevo"
          width={80}
          height={26}
          className="h-6 w-auto hidden sm:block"
        />
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Shield className="h-4 w-4 shrink-0 text-par-3-punch" aria-hidden />
          Verified listings
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Lock className="h-4 w-4 shrink-0 text-par-3-punch" aria-hidden />
          Secure payment protected
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <MapPin className="h-4 w-4 shrink-0 text-par-3-punch" aria-hidden />
          UK only marketplace
        </span>
      </div>
    </div>
  );
}
