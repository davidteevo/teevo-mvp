"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Shield, X } from "lucide-react";
import { calcOrderBreakdown, formatPence, type BuyerFeeConfig } from "@/lib/pricing";

export function PriceWithBreakdown({
  pricePence,
  displayTitle,
  imageUrl,
  fees,
}: {
  pricePence: number;
  displayTitle: string;
  imageUrl?: string | null;
  fees: BuyerFeeConfig | null;
}) {
  const [open, setOpen] = useState(false);
  const breakdown = fees ? calcOrderBreakdown(pricePence, fees) : null;
  const itemPence = breakdown?.itemPence ?? pricePence;
  const authenticityPence = breakdown?.authenticityPence ?? 0;
  const shippingPence = breakdown?.shippingPence ?? 0;
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

  const modalContent = open && fees && breakdown && (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={closeModal}
      />
      <div
        role="dialog"
        aria-labelledby="price-breakdown-title"
        className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white text-mowing-green p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="price-breakdown-title" className="text-lg font-semibold">
            Price breakdown
          </h2>
          <button type="button" onClick={closeModal} className="p-1 rounded-lg hover:bg-mowing-green/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-3 mt-4 pb-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-mowing-green/10 shrink-0">
            <Image src={thumbSrc} alt="" fill className="object-cover" sizes="64px" />
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
  );

  return (
    <>
      <div className="mt-1.5">
        <p className="text-base font-bold text-mowing-green">{formatPence(itemPence)}</p>
        {fees ? (
          <button
            type="button"
            onClick={openModal}
            className="text-sm text-mowing-green/80 hover:text-mowing-green hover:underline underline-offset-2 flex items-center gap-1 mt-0.5 font-medium"
            aria-label="Show price breakdown"
          >
            {formatPence(inclPence)} incl. <Shield className="h-3.5 w-3.5 text-mowing-green" aria-hidden />
          </button>
        ) : null}
      </div>

      {typeof document !== "undefined" && document.body && modalContent
        ? createPortal(modalContent, document.body)
        : modalContent}
    </>
  );
}
