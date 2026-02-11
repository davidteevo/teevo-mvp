import Image from "next/image";
import { Shield, Lock, MapPin } from "lucide-react";

export function TrustStrip() {
  return (
    <div className="bg-mowing-green text-off-white-pique py-2 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm">
        <Image
          src="/logo-text-white.png"
          alt="Teevo"
          width={80}
          height={26}
          className="h-6 w-auto hidden sm:block"
        />
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-par-3-punch" aria-hidden />
          Verified listings
        </span>
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-par-3-punch" aria-hidden />
          Secure payment protected
        </span>
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-par-3-punch" aria-hidden />
          UK only marketplace
        </span>
      </div>
    </div>
  );
}
