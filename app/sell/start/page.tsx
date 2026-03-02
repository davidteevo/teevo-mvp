"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ImageUpload } from "@/components/listing/ImageUpload";
import { track } from "@/lib/analytics";

const LISTINGS_BUCKET = "listings";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUBMIT_TIMEOUT_MS = 120_000;

const CATEGORIES = ["Driver", "Woods", "Irons", "Wedges", "Putter", "Apparel", "Bag"] as const;
const CONDITIONS = ["New", "Excellent", "Good", "Fair", "Used"] as const;
const PARCEL_PRESET = "SMALL_ITEM";

type SubmitPhase = "creating" | "upload_urls" | "uploading" | "saving";
type SubmitStatus = { phase: SubmitPhase; current?: number; total?: number } | null;

function SellStartContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fire seller_listing_started once when landing (and optional new=1 for signup complete)
  useEffect(() => {
    if (!loading && user) {
      track("seller_listing_started");
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent("/sell/start")}`);
    return null;
  }

  const canStep1 = title.trim().length > 0 && category && condition;
  const canStep2 = images.length >= 5 && images.length <= 6;
  const canStep4 = price.trim().length > 0 && !Number.isNaN(parseFloat(price)) && parseFloat(price) > 0;

  const handlePublish = async () => {
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const timeoutId = window.setTimeout(() => abortRef.current?.abort(), SUBMIT_TIMEOUT_MS);
    setSubmitting(true);
    try {
      const pricePence = Math.round(parseFloat(price) * 100);
      if (Number.isNaN(pricePence) || pricePence <= 0) throw new Error("Invalid price");
      if (images.length < 5 || images.length > 6) throw new Error("Upload 5–6 images");

      track("seller_listing_completed");
      setSubmitStatus({ phase: "creating" });
      const createRes = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          brand: "Other",
          model: title.trim().slice(0, 500),
          title: title.trim() || null,
          condition,
          description: description.trim() || null,
          price: pricePence,
          imageCount: images.length,
          parcelPreset: PARCEL_PRESET,
        }),
        signal,
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(createData.error ?? "Failed to create listing");
      const listingId = createData.id as string;
      if (!listingId) throw new Error("No listing id returned");

      setSubmitStatus({ phase: "upload_urls" });
      const urlsRes = await fetch(`/api/listings/${listingId}/upload-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: images.length }),
        signal,
      });
      const urlsData = await urlsRes.json().catch(() => ({}));
      if (!urlsRes.ok) throw new Error(urlsData.error ?? "Failed to get upload URLs");
      const uploads = urlsData.uploads as { path: string; token: string }[] | undefined;
      if (!Array.isArray(uploads) || uploads.length !== images.length) throw new Error("Invalid upload URLs");

      track("seller_listing_photo_upload", { count: images.length });
      const paths: string[] = [];
      const allowedExt = ["jpg", "jpeg", "png", "gif", "webp"];
      if (!SUPABASE_URL) throw new Error("Missing Supabase URL");
      for (let i = 0; i < images.length; i++) {
        if (signal.aborted) throw new Error("Upload cancelled");
        setSubmitStatus({ phase: "uploading", current: i + 1, total: images.length });
        const file = images[i];
        if (!file?.size) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        if (!allowedExt.includes(ext)) continue;
        const { path, token } = uploads[i];
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/upload/sign/${LISTINGS_BUCKET}/${path}?token=${encodeURIComponent(token)}`;
        const formData = new FormData();
        formData.append("cacheControl", "3600");
        formData.append("", file);
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: formData,
          headers: { "x-upsert": "true" },
          signal,
        });
        if (!uploadRes.ok) throw new Error(`Image ${i + 1} upload failed. Try again.`);
        paths.push(path);
      }
      if (paths.length < 5) throw new Error("At least 5 valid images (JPG, PNG, GIF, WebP) are required.");

      setSubmitStatus({ phase: "saving" });
      const imagesRes = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
        signal,
      });
      if (!imagesRes.ok) {
        const imagesData = await imagesRes.json().catch(() => ({}));
        throw new Error(imagesData.error ?? "Failed to save images");
      }

      track("seller_listing_published", { listingId });
      router.push(`/sell/start/success?listingId=${listingId}`);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.name === "AbortError"
            ? "Request took too long. Please try again."
            : e.message
          : "Something went wrong. Please try again.";
      alert(message);
    } finally {
      window.clearTimeout(timeoutId);
      abortRef.current = null;
      setSubmitting(false);
      setSubmitStatus(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-mowing-green/80">
          Step {step} of 4
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mowing-green/20">
          <div
            className="h-full rounded-full bg-mowing-green transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-mowing-green/60">
          Most sellers finish in under 3 minutes.
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-mowing-green">Item basics</h1>
          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brand + Model + Loft/Size (e.g. TaylorMade Stealth 2 Driver 9°)"
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">
              Category *
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
            >
              <option value="">Select</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">
              Condition *
            </label>
            <select
              required
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
            >
              <option value="">Select</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-mowing-green/60">
            Be honest — it builds trust.
          </p>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canStep1}
            className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-mowing-green">Photos</h1>
          <p className="text-sm text-mowing-green/80">
            Front, back, sole, shaft, and grip work best.
          </p>
          <p className="text-xs text-mowing-green/60">
            Natural light &gt; flash.
          </p>
          <ImageUpload
            min={5}
            max={6}
            value={images}
            onChange={setImages}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-mowing-green/40 text-mowing-green px-6 py-3 font-medium hover:bg-mowing-green/5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canStep2}
              className="flex-1 rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-mowing-green">Description</h1>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Why are you selling? How often was it used? Any upgrades or custom shafts?"
            className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50 resize-y"
          />
          <p className="text-xs text-mowing-green/60">
            Short and honest beats long and vague.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-xl border border-mowing-green/40 text-mowing-green px-6 py-3 font-medium hover:bg-mowing-green/5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-mowing-green">Price</h1>
          <div>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Fair pricing sells faster."
              className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
            />
          </div>
          <p className="text-xs text-mowing-green/60">
            Check similar listings for guidance.
          </p>

          {submitting && submitStatus && (
            <div className="rounded-xl border border-mowing-green/30 bg-mowing-green/5 p-4" role="status">
              <div className="flex items-center gap-3">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-mowing-green/30 border-t-mowing-green" />
                <span className="text-sm font-medium text-mowing-green">
                  {submitStatus.phase === "creating" && "Creating listing…"}
                  {submitStatus.phase === "upload_urls" && "Preparing upload…"}
                  {submitStatus.phase === "uploading" &&
                    `Uploading image ${submitStatus.current ?? 0} of ${submitStatus.total ?? 0}…`}
                  {submitStatus.phase === "saving" && "Saving…"}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={submitting}
              className="rounded-xl border border-mowing-green/40 text-mowing-green px-6 py-3 font-medium hover:bg-mowing-green/5 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canStep4 || submitting}
              className="flex-1 rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Publish listing
            </button>
          </div>
          <p className="text-xs text-mowing-green/60 text-center">
            You can edit this anytime.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SellStartPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <SellStartContent />
    </Suspense>
  );
}
