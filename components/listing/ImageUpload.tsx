"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";

interface ImageUploadProps {
  min: number;
  max: number;
  value: File[];
  onChange: (files: File[]) => void;
  /** Optional labels for each slot (e.g. "Face", "Shaft") — shown under thumbnails when provided */
  slotLabels?: string[];
  /** Hero variant: larger drop zone and "Drag and drop or click" copy */
  variant?: "default" | "hero";
}

export function ImageUpload({ min, max, value, onChange, slotLabels, variant = "default" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHero = variant === "hero";

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...value];
    for (let i = 0; i < files.length && next.length < max; i++) {
      next.push(files[i]);
    }
    onChange(next.slice(0, max));
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files ?? null);
          e.target.value = "";
        }}
      />
      {value.length < max && (
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
      <div className="flex flex-wrap gap-2">
        {value.map((file, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="relative w-20 h-20 rounded-lg border border-par-3-punch/30 bg-mowing-green/5 overflow-hidden">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {slotLabels?.[i] && (
              <span className="text-[10px] font-medium text-mowing-green/70 max-w-20 truncate text-center">
                {slotLabels[i]}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-mowing-green/60">
        {value.length} / {max} images (min {min})
      </p>
    </div>
  );
}
