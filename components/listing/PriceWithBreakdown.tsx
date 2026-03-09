"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Shield, X } from "lucide-react";
import { calcOrderBreakdown, formatPence } from "@/lib/pricing";

export function PriceWithBreakdown({
  pricePence,
  displayTitle,
  imageUrl,
}: {
  pricePence: number;
  displayTitle: string;
  imageUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { itemPence, authenticityPence, shippingPence } = calcOrderBreakdown(pricePence);
  const inclPence = itemPence + authenticityPence;

  const openModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }, []);

  const closeModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  }, []);

  const thumbSrc = imageUrl ?? "/placeholder-listing.svg";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div className="mt-1.5">
        <p className="text-base font-bold text-mowing-green">{formatPence(itemPence)}</p>
        <button
          type="button"
          onClick={openModal}
          className="text-sm text-mowing-green/80 hover:text-mowing-green hover:underline underline-offset-2 flex items-center gap-1 mt-0.5 font-medium"
          aria-label="Show price breakdown"
        >
          {formatPence(inclPence)} incl. <Shield className="h-3.5 w-3.5 text-mowing-green" aria-hidden />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="price-breakdown-title"
        >
          <div
            className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 text-mowing-green"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="price-breakdown-title" className="text-xl font-bold">
                Price breakdown
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded hover:bg-mowing-green/10 text-mowing-green"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-mowing-green/5">
                <Image
                  src={thumbSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0">
                <p className="font-medium line-clamp-2">{displayTitle}</p>
                <p className="text-sm text-mowing-green/80 mt-0.5">{formatPence(itemPence)}</p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 py-3 border-t border-mowing-green/15">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-mowing-green shrink-0" aria-hidden />
                <span className="text-sm">Authenticity &amp; Protection</span>
              </div>
              <span className="text-sm font-medium">{formatPence(authenticityPence)}</span>
            </div>

            <div className="flex items-start justify-between gap-2 py-3 border-t border-mowing-green/15">
              <div>
                <p className="text-xs text-mowing-green/70 mb-0.5">Select at checkout</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Postage from {formatPence(shippingPence)}</span>
                </div>
                <p className="text-xs text-mowing-green/60 mt-0.5">Depends on the shipping choice</p>
              </div>
            </div>

            <p className="text-xs text-mowing-green/70 pt-3 border-t border-mowing-green/15 mt-3">
              Our Authenticity &amp; Protection fee is mandatory when you purchase an item on Teevo. It is added to
              every purchase made with the &apos;Buy Now&apos; button. The item price is set by the seller and may be
              subject to negotiation.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
