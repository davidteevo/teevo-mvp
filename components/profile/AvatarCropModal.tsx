"use client";

import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";

export function AvatarCropModal({
  imageSrc,
  isOpen,
  isSaving,
  onCancel,
  onSave,
}: {
  imageSrc: string;
  isOpen: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (croppedAreaPixels: Area) => void | Promise<void>;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageSrc, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 p-3 sm:p-6 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      onClick={isSaving ? undefined : onCancel}
    >
      <div
        className="mx-auto w-full max-w-lg rounded-2xl bg-white text-mowing-green shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <h2 id="avatar-crop-title" className="text-lg sm:text-xl font-bold">
            Adjust profile photo
          </h2>
          <p className="mt-1 text-sm text-mowing-green/75">
            Drag to reposition and use zoom to frame your avatar.
          </p>

          <div className="relative mt-4 h-[56vh] min-h-[280px] max-h-[420px] w-full overflow-hidden rounded-xl bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={1}
              maxZoom={3}
              objectFit="cover"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="avatar-zoom" className="block text-sm font-medium mb-1">
              Zoom
            </label>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-mowing-green/10 bg-white p-4 sm:p-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-mowing-green/40 px-4 py-3 font-semibold hover:bg-mowing-green/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => croppedAreaPixels && onSave(croppedAreaPixels)}
            disabled={isSaving || !croppedAreaPixels}
            className="flex-1 rounded-xl bg-mowing-green px-4 py-3 font-semibold text-off-white-pique hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
