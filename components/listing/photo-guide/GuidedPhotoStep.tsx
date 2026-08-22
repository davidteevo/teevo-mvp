"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { PhotoSlotIllustration } from "@/components/listing/photo-guide/PhotoSlotIllustration";
import { getPhotoSlots } from "@/lib/listing-photos/requirements";
import { MAX_LISTING_IMAGES } from "@/lib/listing-photos/types";
import type { PhotoSlot } from "@/lib/listing-photos/types";
import { track } from "@/lib/analytics";

export type GuidedPhotoValue = {
  filesBySlot: Record<string, File>;
  extras: File[];
  serialNotFound: boolean;
};

export function GuidedPhotoStep({
  category,
  listingFormat,
  wedgeLofts,
  value,
  onChange,
}: {
  category: string;
  listingFormat?: "single" | "set" | "" | null;
  wedgeLofts?: string[];
  value: GuidedPhotoValue;
  onChange: (next: GuidedPhotoValue) => void;
}) {
  const slots = useMemo(
    () => getPhotoSlots({ category, listingFormat, wedgeLofts }),
    [category, listingFormat, wedgeLofts]
  );
  const requiredSlots = slots.filter((s) => s.required);
  const [focusKey, setFocusKey] = useState(requiredSlots[0]?.key ?? "");
  const [helpOpen, setHelpOpen] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    track("photo_flow_started", { category });
    startedAt.current = Date.now();
    return () => {
      const done = requiredSlots.every(
        (s) => value.filesBySlot[s.key] || (s.serialHelp && value.serialNotFound)
      );
      if (!done) {
        track("photo_flow_abandoned", { category, imageCount: Object.keys(value.filesBySlot).length });
      }
    };
    // start/abandon once per category
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (!requiredSlots.some((s) => s.key === focusKey)) {
      setFocusKey(requiredSlots[0]?.key ?? "");
    }
  }, [requiredSlots, focusKey]);

  const completedRequired = requiredSlots.filter(
    (s) => value.filesBySlot[s.key] || (s.serialHelp && value.serialNotFound)
  ).length;
  const current = slots.find((s) => s.key === focusKey) ?? requiredSlots[0];
  const allRequiredDone = completedRequired === requiredSlots.length && requiredSlots.length > 0;

  const completedRef = useRef(false);
  useEffect(() => {
    if (allRequiredDone && !completedRef.current) {
      completedRef.current = true;
      track("photo_flow_completed", {
        category,
        numberOfImages: Object.keys(value.filesBySlot).length + value.extras.length,
        completionMs: Date.now() - startedAt.current,
      });
    }
  }, [allRequiredDone, category, value.filesBySlot, value.extras.length]);

  const progressCopy =
    requiredSlots.length === 0
      ? "Let's get your club looking sharp."
      : completedRequired === 0
        ? "Let's get your club looking sharp."
        : allRequiredDone
          ? "Nailed it! 🎉 We've got what we need."
          : completedRequired === requiredSlots.length - 1
            ? "Just one more 👌"
            : completedRequired >= Math.ceil(requiredSlots.length / 2)
              ? "Looking good — keep going."
              : "Let's get your club looking sharp.";

  const assignFile = (slot: PhotoSlot, file: File, replaced: boolean) => {
    const nextFiles = { ...value.filesBySlot, [slot.key]: file };
    onChange({
      ...value,
      filesBySlot: nextFiles,
      serialNotFound: slot.serialHelp ? false : value.serialNotFound,
    });
    track(replaced ? "required_photo_replaced" : "required_photo_uploaded", {
      category,
      imageType: slot.imageType,
    });
    const nextEmpty = requiredSlots.find(
      (s) => s.key !== slot.key && !nextFiles[s.key] && !(s.serialHelp && value.serialNotFound)
    );
    if (nextEmpty) setFocusKey(nextEmpty.key);
  };

  const onPick = (slot: PhotoSlot, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    assignFile(slot, file, Boolean(value.filesBySlot[slot.key]));
  };

  const removeSlot = (slot: PhotoSlot) => {
    const next = { ...value.filesBySlot };
    delete next[slot.key];
    onChange({ ...value, filesBySlot: next });
    track("required_photo_removed", { category, imageType: slot.imageType });
    setFocusKey(slot.key);
  };

  const addExtras = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const room = MAX_LISTING_IMAGES - (Object.keys(value.filesBySlot).length + value.extras.length);
    const added = Array.from(fileList).slice(0, Math.max(0, room));
    if (!added.length) return;
    onChange({ ...value, extras: [...value.extras, ...added] });
    track("optional_photo_uploaded", { category, numberOfImages: added.length });
  };

  if (!current) {
    return <p className="text-sm text-mowing-green/70">Select a category to see photo tips.</p>;
  }

  const hasFile = Boolean(value.filesBySlot[current.key]);
  const serialSkipped = Boolean(current.serialHelp && value.serialNotFound);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-mowing-green mb-1">Let&apos;s make it look good 📸</h2>
        <p className="text-sm text-mowing-green/70">
          A few clear photos help buyers feel confident — and help us get your club verified.
        </p>
        <p className="mt-3 text-sm font-semibold text-mowing-green">
          {completedRequired} of {requiredSlots.length} done
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {requiredSlots.map((s) => {
            const done = Boolean(value.filesBySlot[s.key]) || (s.serialHelp && value.serialNotFound);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setFocusKey(s.key)}
                className={`h-2.5 w-2.5 rounded-full ${
                  done ? "bg-mowing-green" : s.key === focusKey ? "bg-par-3-punch" : "bg-mowing-green/20"
                }`}
                aria-label={s.title}
              />
            );
          })}
        </div>
        <p className="mt-2 text-sm text-mowing-green/80">{progressCopy}</p>
      </div>

      <div className="rounded-2xl border border-par-3-punch/25 bg-white p-4 space-y-3">
        <PhotoSlotIllustration id={current.illustrationId} />
        <h3 className="text-base font-semibold text-mowing-green">{current.title}</h3>
        <p className="text-sm text-mowing-green/70">{current.helper}</p>

        {current.serialHelp ? (
          <div className="space-y-2">
            <button
              type="button"
              className="text-sm font-medium text-mowing-green underline"
              onClick={() => setHelpOpen((v) => !v)}
            >
              Where do I find this?
            </button>
            {helpOpen ? (
              <p className="text-sm text-mowing-green/70 rounded-xl bg-off-white-pique p-3">
                Serial markings are often near the hosel, adapter, or under the head — it varies by brand.
                A clear close-up of the neck/hosel is still helpful even if you cannot see a number.
              </p>
            ) : null}
          </div>
        ) : null}

        {hasFile ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-mowing-green">✓ Added</p>
            <img
              src={URL.createObjectURL(value.filesBySlot[current.key])}
              alt=""
              className="h-28 w-28 rounded-xl object-cover border border-mowing-green/15"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-[44px] rounded-xl border border-mowing-green/30 px-4 text-sm font-medium text-mowing-green"
                onClick={() => libraryRef.current?.click()}
              >
                Replace
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-xl border border-mowing-green/30 px-4 text-sm font-medium text-mowing-green"
                onClick={() => removeSlot(current)}
              >
                Remove
              </button>
            </div>
          </div>
        ) : serialSkipped ? (
          <p className="text-sm font-medium text-mowing-green">We&apos;ll skip the serial for now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="min-h-[48px] rounded-xl bg-mowing-green text-white font-semibold inline-flex items-center justify-center gap-2"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="h-4 w-4" /> Take photo
            </button>
            <button
              type="button"
              className="min-h-[48px] rounded-xl border border-mowing-green/30 text-mowing-green font-semibold inline-flex items-center justify-center gap-2"
              onClick={() => libraryRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" /> Choose from library
            </button>
            {current.serialHelp ? (
              <button
                type="button"
                className="text-sm text-mowing-green/80 underline"
                onClick={() => {
                  onChange({ ...value, serialNotFound: true });
                  track("serial_not_found_selected", { category, imageType: current.imageType });
                  const nextEmpty = requiredSlots.find((s) => s.key !== current.key && !value.filesBySlot[s.key]);
                  if (nextEmpty) setFocusKey(nextEmpty.key);
                }}
              >
                I can&apos;t find a serial number
              </button>
            ) : null}
          </div>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            onPick(current, e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onPick(current, e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {requiredSlots.map((s) => {
          const done = Boolean(value.filesBySlot[s.key]) || (s.serialHelp && value.serialNotFound);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setFocusKey(s.key)}
              className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                s.key === focusKey
                  ? "border-mowing-green bg-mowing-green text-white"
                  : done
                    ? "border-mowing-green/40 text-mowing-green"
                    : "border-mowing-green/20 text-mowing-green/60"
              }`}
            >
              {s.imageType === "wedge_specs" ? s.title.split("—")[0] : s.imageType.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {allRequiredDone ? (
        <div className="rounded-2xl border border-dashed border-par-3-punch/40 p-4 space-y-2">
          <p className="font-semibold text-mowing-green">Nice work — we&apos;ve got what we need! 🙌</p>
          <p className="text-sm text-mowing-green/70">Want to show buyers anything else?</p>
          <button
            type="button"
            className="min-h-[44px] rounded-xl border border-mowing-green/30 px-4 text-sm font-semibold text-mowing-green"
            onClick={() => extraRef.current?.click()}
          >
            + Add more photos
          </button>
          <input
            ref={extraRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addExtras(e.target.files);
              e.target.value = "";
            }}
          />
          {value.extras.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {value.extras.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative">
                  <img src={URL.createObjectURL(file)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black/60 text-white text-xs"
                    onClick={() =>
                      onChange({ ...value, extras: value.extras.filter((_, idx) => idx !== i) })
                    }
                    aria-label="Remove extra photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function guidedPhotosComplete(slots: PhotoSlot[], value: GuidedPhotoValue): boolean {
  return slots
    .filter((s) => s.required)
    .every((s) => value.filesBySlot[s.key] || (s.serialHelp && value.serialNotFound));
}

export function flattenGuidedPhotos(slots: PhotoSlot[], value: GuidedPhotoValue) {
  const required = slots.map((slot) => ({
    slot,
    file: value.filesBySlot[slot.key] ?? null,
    skipped: Boolean(slot.serialHelp && value.serialNotFound && !value.filesBySlot[slot.key]),
  }));
  const extras = value.extras.map((file, i) => ({
    slot: {
      key: `extra-${i}`,
      imageType: "extra" as const,
      visibility: "public" as const,
      required: false,
      title: "Extra",
      helper: "",
      illustrationId: "hero" as const,
    },
    file,
    skipped: false,
  }));
  return [...required, ...extras].filter((row) => row.file);
}
