"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ListingForm, type SubmitStatus } from "@/components/listing/ListingForm";
import { ALL_CATEGORIES, CONDITIONS } from "@/lib/listing-categories";
import { compressListingMain, compressListingThumb } from "@/lib/image-compression";

const LISTINGS_BUCKET = "listings";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUBMIT_TIMEOUT_MS = 120_000; // 2 min total for create + upload URLs + uploads + images

const CLUB_BRANDS = [
  "Titleist", "Callaway", "TaylorMade", "Ping", "Cobra", "Mizuno", "Srixon", "Wilson", "Other",
];

function SellPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const initialCategory =
    categoryFromUrl && ALL_CATEGORIES.includes(categoryFromUrl as (typeof ALL_CATEGORIES)[number])
      ? categoryFromUrl
      : "";
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
        Loading…
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent("/sell")}`);
    return null;
  }

  const handleSubmit = async (payload: {
    category: string;
    brand: string;
    model?: string | null;
    condition: string;
    description: string;
    price: string;
    title?: string;
    shaft?: string;
    degree?: string;
    shaftFlex?: string;
    handed?: "left" | "right";
    item_type?: string | null;
    size?: string | null;
    colour?: string | null;
    images: File[];
  }) => {
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const timeoutId = window.setTimeout(() => abortRef.current?.abort(), SUBMIT_TIMEOUT_MS);

    setSubmitting(true);
    try {
      const pricePence = Math.round(parseFloat(payload.price) * 100);
      if (Number.isNaN(pricePence) || pricePence <= 0) {
        throw new Error("Invalid price");
      }
      const images = payload.images;
      if (images.length < 5 || images.length > 6) {
        throw new Error("Please upload 5 or 6 images (Front, Back, Sole, Shaft, Grip).");
      }

      // 1. Create listing (metadata only — no image bytes through API, so no body size limit)
      setSubmitStatus({ phase: "creating" });
      const createRes = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: payload.category,
          brand: payload.brand,
          model: payload.model ?? null,
          title: payload.title?.trim() || null,
          condition: payload.condition,
          description: payload.description || null,
          price: pricePence,
          imageCount: images.length,
          shaft: payload.shaft || null,
          degree: payload.degree || null,
          shaft_flex: payload.shaftFlex || null,
          handed: payload.handed || null,
          item_type: payload.item_type ?? null,
          size: payload.size ?? null,
          colour: payload.colour ?? null,
        }),
        signal,
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createData.error ?? "Failed to create listing");
      }
      const listingId = createData.id as string;
      if (!listingId) throw new Error("No listing id returned");

      // 2. Get signed upload URLs (avoids Storage RLS; server authorizes via service role)
      setSubmitStatus({ phase: "upload_urls" });
      const urlsRes = await fetch(`/api/listings/${listingId}/upload-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: images.length }),
        signal,
      });
      const urlsData = await urlsRes.json().catch(() => ({}));
      if (!urlsRes.ok) {
        throw new Error(urlsData.error ?? "Failed to get upload URLs");
      }
      const uploads = urlsData.uploads as { path: string; token: string }[] | undefined;
      const expectedUploads = images.length * 2; // main + thumb per image
      if (!Array.isArray(uploads) || uploads.length !== expectedUploads) {
        throw new Error("Invalid upload URLs response");
      }

      const allowedExt = ["jpg", "jpeg", "png", "gif", "webp"];
      const mainPaths: string[] = [];
      if (!SUPABASE_URL) throw new Error("Missing Supabase URL");

      for (let i = 0; i < images.length; i++) {
        if (signal.aborted) throw new Error("Upload cancelled");
        const file = images[i];
        if (!file?.size) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        if (!allowedExt.includes(ext)) continue;

        setSubmitStatus({ phase: "compressing", current: i + 1, total: images.length });
        let mainBlob: Blob;
        let thumbBlob: Blob;
        try {
          [mainBlob, thumbBlob] = await Promise.all([
            compressListingMain(file),
            compressListingThumb(file),
          ]);
        } catch (err) {
          throw new Error(
            err instanceof Error ? err.message : "Image compression failed. Try different photos."
          );
        }

        setSubmitStatus({ phase: "uploading", current: i + 1, total: images.length });
        const mainEntry = uploads[2 * i];
        const thumbEntry = uploads[2 * i + 1];
        const uploadOne = async (path: string, token: string, blob: Blob) => {
          const uploadUrl = `${SUPABASE_URL}/storage/v1/object/upload/sign/${LISTINGS_BUCKET}/${path}?token=${encodeURIComponent(token)}`;
          const formData = new FormData();
          formData.append("cacheControl", "3600");
          formData.append("", blob, path.split("/").pop() ?? "image.webp");
          const res = await fetch(uploadUrl, {
            method: "PUT",
            body: formData,
            headers: { "x-upsert": "true" },
            signal,
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText ? `${errText.slice(0, 100)}` : `Upload failed (${res.status}). Try again.`);
          }
        };
        await uploadOne(mainEntry.path, mainEntry.token, mainBlob);
        await uploadOne(thumbEntry.path, thumbEntry.token, thumbBlob);
        mainPaths.push(mainEntry.path);
      }

      if (mainPaths.length < 5) {
        throw new Error("At least 5 valid images (JPG, PNG, GIF, WebP) are required.");
      }

      // 4. Register main image paths with the API (thumb paths are derived by convention)
      setSubmitStatus({ phase: "saving" });
      const imagesRes = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: mainPaths }),
        signal,
      });
      const imagesData = await imagesRes.json().catch(() => ({}));
      if (!imagesRes.ok) {
        throw new Error(imagesData.error ?? "Failed to save image list");
      }

      router.push("/sell/success");
    } catch (e) {
      let message: string;
      if (e instanceof Error) {
        if (e.name === "AbortError") {
          message = "Request took too long. Please check your connection and try again.";
        } else if (
          e.name === "TypeError" ||
          e.message === "Failed to fetch" ||
          e.message === "Load failed" ||
          /network|fetch|load failed/i.test(e.message)
        ) {
          message =
            "Couldn't reach the server. Check your connection and try again. If it keeps happening, the site may be temporarily unavailable.";
        } else {
          message = e.message;
        }
      } else {
        message = "Something went wrong. Please try again.";
      }
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
      <h1 className="text-2xl font-bold text-mowing-green">Sell your gear</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        We verify every listing to protect buyers and sellers.
      </p>
      <div className="mt-4 rounded-xl border border-mowing-green/20 bg-mowing-green/5 p-4">
        <p className="text-sm font-medium text-mowing-green mb-2">Sell in 3 steps</p>
        <ol className="text-sm text-mowing-green/80 space-y-1">
          <li><strong>1. List your item</strong> — Add photos and key details</li>
          <li><strong>2. We verify it</strong> — Within 24 hours</li>
          <li><strong>3. Get paid</strong> — When it sells</li>
        </ol>
      </div>
      <ListingForm
        categories={ALL_CATEGORIES}
        brands={CLUB_BRANDS}
        conditions={CONDITIONS}
        initialCategory={initialCategory}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitStatus={submitStatus}
      />
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>
    }>
      <SellPageContent />
    </Suspense>
  );
}
