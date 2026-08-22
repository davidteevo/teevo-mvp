"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { getListingImageUrl } from "@/lib/listing-images";

export type StoredImage = {
  id: string;
  storage_path: string;
  sort_order: number;
  visibility?: "public" | "verification_only" | null;
};

interface BaseProps {
  min: number;
  max: number;
  slotLabels?: string[];
  variant?: "default" | "hero";
}

interface FileMode extends BaseProps {
  mode?: "files";
  value: File[];
  onChange: (files: File[]) => void;
  storedImages?: never;
  onStoredImagesChange?: never;
}

interface StoredMode extends BaseProps {
  mode: "stored";
  storedImages: StoredImage[];
  onStoredImagesChange: (images: StoredImage[]) => void;
  value?: never;
  onChange?: never;
}

type ImageUploadProps = FileMode | StoredMode;

export function ImageUpload(props: ImageUploadProps) {
  const { min, max, slotLabels, variant = "default" } = props;
  const isHero = variant === "hero";
  const isStoredMode = props.mode === "stored";

  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // ---------- File mode helpers ----------
  const files: File[] = isStoredMode ? [] : (props.value ?? []);
  const count = isStoredMode ? props.storedImages.length : files.length;

  const addFiles = (fileList: FileList | null) => {
    if (isStoredMode || !fileList?.length) return;
    const next = [...files];
    for (let i = 0; i < fileList.length && next.length < max; i++) {
      next.push(fileList[i]);
    }
    props.onChange(next.slice(0, max));
  };

  const removeFile = (index: number) => {
    if (isStoredMode) return;
    props.onChange(files.filter((_, i) => i !== index));
  };

  // ---------- Reorder (shared pointer-events logic) ----------
  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (isStoredMode) {
      const next = [...props.storedImages];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      props.onStoredImagesChange(next.map((img, i) => ({ ...img, sort_order: i })));
    } else {
      const next = [...files];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      props.onChange(next);
    }
  };

  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handlePointerDown = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    dragIndex.current = index;
    setDraggingIndex(index);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragIndex.current === null) return;
    // pointer capture routes all move events to the dragging element, so use
    // elementFromPoint to find which tile is physically under the cursor
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const targetIndex = tileRefs.current.findIndex(
      (ref) => ref && (ref === el || ref.contains(el))
    );
    if (targetIndex === -1 || targetIndex === dragIndex.current) return;
    reorder(dragIndex.current, targetIndex);
    dragIndex.current = targetIndex;
    setDraggingIndex(targetIndex);
  };

  const handlePointerUp = () => {
    dragIndex.current = null;
    setDraggingIndex(null);
  };

  // ---------- Thumbnail src helpers ----------
  const getThumbnailSrc = (index: number): string => {
    if (isStoredMode) {
      return getListingImageUrl(props.storedImages[index].storage_path, "thumb");
    }
    return URL.createObjectURL(files[index]);
  };

  const thumbnailCount = isStoredMode ? props.storedImages.length : files.length;

  return (
    <div className="space-y-3">
      {!isStoredMode && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files ?? null);
            e.target.value = "";
          }}
        />
      )}

      {/* Upload button — only in file mode when not at max */}
      {!isStoredMode && count < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed border-par-3-punch/50 text-mowing-green/70 flex flex-col items-center justify-center gap-2 hover:border-par-3-punch hover:text-mowing-green transition-colors ${
            isHero ? "py-12 px-6 min-h-[140px]" : "py-6"
          }`}
        >
          <Upload className={isHero ? "h-10 w-10" : "h-6 w-6"} />
          {isHero && (
            <span className="text-sm font-medium">Drag and drop or click to add photos</span>
          )}
        </button>
      )}

      {/* Helper text shown when 2+ images are present */}
      {thumbnailCount >= 2 && (
        <p className="text-xs text-mowing-green/70 font-medium">
          Drag your photos to reorder them. Your first photo will be your main listing photo.
        </p>
      )}

      {/* Thumbnail grid */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: thumbnailCount }).map((_, i) => (
          <div
            key={isStoredMode ? props.storedImages[i].id : i}
            ref={(el) => { tileRefs.current[i] = el; }}
            className={`flex flex-col items-center gap-0.5 touch-none select-none cursor-grab active:cursor-grabbing transition-opacity duration-150 ${
              draggingIndex === i ? "opacity-50 scale-95" : "opacity-100"
            }`}
            onPointerDown={handlePointerDown(i)}
            onPointerMove={handlePointerMove(i)}
            onPointerUp={handlePointerUp}
          >
            <div className="relative w-20 h-20 rounded-lg border border-par-3-punch/30 bg-mowing-green/5 overflow-hidden">
              <img
                src={getThumbnailSrc(i)}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              {/* Remove button — file mode only */}
              {!isStoredMode && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => removeFile(i)}
                  className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {/* Main photo badge on first image */}
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-semibold bg-mowing-green/80 text-off-white-pique py-0.5 leading-tight truncate">
                  Main photo
                </span>
              )}
            </div>
            {/* Slot label — skip index 0 (replaced by badge) */}
            {slotLabels?.[i] && i > 0 && (
              <span className="text-[10px] font-medium text-mowing-green/70 max-w-20 truncate text-center">
                {slotLabels[i]}
              </span>
            )}
          </div>
        ))}
      </div>

      {!isStoredMode && (
        <p className="text-xs text-mowing-green/60">
          {count} / {max} images (min {min})
        </p>
      )}
    </div>
  );
}
