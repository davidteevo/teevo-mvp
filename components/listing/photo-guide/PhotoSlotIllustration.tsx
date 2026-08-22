"use client";

import type { ListingPhotoIllustrationId } from "@/lib/listing-photos/types";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 160 110" className="w-full h-auto max-h-36" aria-hidden>
      <rect x="0" y="0" width="160" height="110" rx="16" fill="#FDFCF5" />
      {children}
    </svg>
  );
}

export function PhotoSlotIllustration({ id }: { id: ListingPhotoIllustrationId }) {
  switch (id) {
    case "face":
      return (
        <Frame>
          <ellipse cx="80" cy="58" rx="42" ry="32" fill="#265C4B" />
          <rect x="48" y="46" width="64" height="28" rx="4" fill="#49C184" />
          <rect x="52" y="50" width="56" height="3" rx="1" fill="#FFD25E" />
          <rect x="52" y="57" width="56" height="3" rx="1" fill="#FFD25E" />
          <rect x="52" y="64" width="56" height="3" rx="1" fill="#FFD25E" />
        </Frame>
      );
    case "sole":
      return (
        <Frame>
          <ellipse cx="80" cy="60" rx="50" ry="22" fill="#265C4B" />
          <path d="M40 58 Q80 78 120 58" fill="none" stroke="#FFD25E" strokeWidth="4" />
        </Frame>
      );
    case "crown":
      return (
        <Frame>
          <ellipse cx="80" cy="62" rx="48" ry="26" fill="#265C4B" />
          <ellipse cx="80" cy="50" rx="36" ry="16" fill="#49C184" />
          <circle cx="80" cy="48" r="5" fill="#FFD25E" />
        </Frame>
      );
    case "back":
    case "putter_rear":
      return (
        <Frame>
          <path d="M40 40 H120 L108 80 H52 Z" fill="#265C4B" />
          <rect x="62" y="50" width="36" height="18" rx="4" fill="#FFD25E" />
        </Frame>
      );
    case "hosel":
    case "putter_neck":
      return (
        <Frame>
          <rect x="74" y="18" width="12" height="52" rx="4" fill="#265C4B" />
          <ellipse cx="80" cy="78" rx="28" ry="14" fill="#49C184" />
          <circle cx="108" cy="40" r="16" fill="none" stroke="#FFD25E" strokeWidth="4" />
          <line x1="119" y1="51" x2="138" y2="70" stroke="#FFD25E" strokeWidth="4" />
        </Frame>
      );
    case "shaft":
      return (
        <Frame>
          <rect x="76" y="12" width="8" height="86" rx="3" fill="#265C4B" />
          <rect x="70" y="38" width="20" height="28" rx="4" fill="#FFD25E" />
        </Frame>
      );
    case "grip":
      return (
        <Frame>
          <rect x="72" y="16" width="16" height="78" rx="8" fill="#265C4B" />
          <rect x="72" y="22" width="16" height="24" rx="6" fill="#FFD25E" />
        </Frame>
      );
    case "set_overview":
      return (
        <Frame>
          <rect x="28" y="28" width="18" height="54" rx="4" fill="#265C4B" />
          <rect x="54" y="22" width="18" height="60" rx="4" fill="#49C184" />
          <rect x="80" y="18" width="18" height="64" rx="4" fill="#265C4B" />
          <rect x="106" y="24" width="18" height="58" rx="4" fill="#49C184" />
        </Frame>
      );
    case "putter_address":
      return (
        <Frame>
          <rect x="36" y="48" width="88" height="22" rx="8" fill="#265C4B" />
          <line x1="80" y1="28" x2="80" y2="82" stroke="#FFD25E" strokeWidth="3" />
        </Frame>
      );
    default:
      return (
        <Frame>
          <rect x="58" y="22" width="12" height="48" rx="3" fill="#265C4B" />
          <ellipse cx="92" cy="62" rx="34" ry="22" fill="#49C184" />
          <circle cx="128" cy="28" r="8" fill="#FFD25E" />
        </Frame>
      );
  }
}
