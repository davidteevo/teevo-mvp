"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";

const ZOOM_LEVELS = [1, 1.5, 2, 2.5, 3];
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const SWIPE_THRESHOLD_PX = 50;

export function ListingImageGallery({
  imageUrls,
  alt,
}: {
  imageUrls: string[];
  alt: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const swipeHandled = useRef(false);

  const mainUrl = imageUrls[selectedIndex] ?? imageUrls[0];
  const hasMultiple = imageUrls.length > 1;

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setSelectedIndex((i) => Math.min(imageUrls.length - 1, i + 1));
  }, [imageUrls.length]);

  const handleSwipeEnd = useCallback(
    (deltaX: number) => {
      if (!hasMultiple || Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return false;
      if (deltaX > 0) goPrev();
      else goNext();
      return true;
    },
    [hasMultiple, goPrev, goNext]
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swipeHandled.current = false;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      swipeHandled.current = handleSwipeEnd(deltaX);
    },
    [handleSwipeEnd]
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    swipeHandled.current = false;
  }, []);
  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (mouseStartX.current === null) return;
      const deltaX = e.clientX - mouseStartX.current;
      mouseStartX.current = null;
      swipeHandled.current = handleSwipeEnd(deltaX);
    },
    [handleSwipeEnd]
  );

  const openZoom = useCallback(() => {
    if (swipeHandled.current) {
      swipeHandled.current = false;
      return;
    }
    setZoomLevel(1);
    setZoomOpen(true);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(MAX_ZOOM, ZOOM_LEVELS[ZOOM_LEVELS.indexOf(z) + 1] ?? z + 0.5));
  }, []);
  const zoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(MIN_ZOOM, ZOOM_LEVELS[ZOOM_LEVELS.indexOf(z) - 1] ?? z - 0.5));
  }, []);

  if (!mainUrl) return null;

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="aspect-square relative rounded-xl overflow-hidden bg-mowing-green/5 group w-full block text-left touch-pan-y"
        onClick={openZoom}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        aria-label="View full size"
      >
        <Image
          src={mainUrl}
          alt={alt}
          fill
          className="object-contain"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <div className="absolute top-3 left-3">
          <VerifiedBadge />
        </div>
        <span
          className="absolute bottom-3 right-3 flex items-center justify-center h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-md text-mowing-green transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none"
          aria-hidden
        >
          <ZoomIn className="h-5 w-5" />
        </span>
      </button>

      {hasMultiple && (
        <div className="grid grid-cols-4 gap-2">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`aspect-square relative rounded-lg overflow-hidden bg-mowing-green/5 transition-all ${
                selectedIndex === i
                  ? "ring-2 ring-mowing-green ring-offset-2 ring-offset-off-white-pique"
                  : "hover:ring-2 hover:ring-mowing-green/40"
              }`}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="120px"
              />
            </button>
          ))}
        </div>
      )}

      {zoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between p-3 bg-black/50 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-white text-sm font-medium min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close zoom"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center min-h-0 p-4">
            <div
              className="relative shrink-0 transition-transform origin-center"
              style={{
                width: "min(80vmin, 600px)",
                height: "min(80vmin, 600px)",
                transform: `scale(${zoomLevel})`,
              }}
            >
              <Image
                src={mainUrl}
                alt={alt}
                fill
                className="object-contain select-none"
                sizes="600px"
                draggable={false}
              />
            </div>
          </div>
          {hasMultiple && (
            <div className="flex flex-wrap justify-center gap-2 pb-4">
              {imageUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    selectedIndex === i
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={url}
                    alt=""
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
