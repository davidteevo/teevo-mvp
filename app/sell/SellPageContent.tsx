"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ListingForm, type ListingFormSubmitPayload, type ListingSubmitProgress } from "@/components/listing/ListingForm";
import { SellJourneyStrip } from "@/components/listing/SellJourneyStrip";
import { ALL_CATEGORIES, CONDITIONS } from "@/lib/listing-categories";
import { compressListingMain, compressListingThumb } from "@/lib/image-compression";
import type { ClubCatalogue } from "@/lib/club-catalogue";
import { uploadListingPhotos } from "@/lib/listing-photos/upload-client";
import {
  MIN_GENERIC_LISTING_IMAGES,
  MAX_GENERIC_LISTING_IMAGES,
} from "@/lib/listing-photos/types";

const LISTINGS_BUCKET = "listings";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUBMIT_TIMEOUT_MS = 120_000; // 2 min total for create + upload URLs + uploads + images

const CLUB_BRANDS = [
  "Titleist", "Callaway", "TaylorMade", "Ping", "Cobra", "Mizuno", "Srixon", "Wilson", "Other",
];

interface SellPageContentProps {
  clubCatalogue: ClubCatalogue;
  clothingBrands?: string[];
}

export function SellPageContent({ clubCatalogue, clothingBrands }: SellPageContentProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const initialCategory =
    categoryFromUrl && ALL_CATEGORIES.includes(categoryFromUrl as (typeof ALL_CATEGORIES)[number])
      ? categoryFromUrl
      : "";
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<ListingSubmitProgress | null>(null);
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

  const handleSubmit = async (payload: ListingFormSubmitPayload) => {
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const timeoutId = window.setTimeout(() => abortRef.current?.abort(), SUBMIT_TIMEOUT_MS);

    setSubmitting(true);
    try {
      const pricePence = Math.round(parseFloat(payload.price) * 100);
      if (Number.isNaN(pricePence) || pricePence <= 0) {
        throw new Error("Invalid price");
      }
      const guided = payload.guidedPhotos;
      if (guided?.length) {
        // guided path below
      } else if (
        payload.images.length < MIN_GENERIC_LISTING_IMAGES ||
        payload.images.length > MAX_GENERIC_LISTING_IMAGES
      ) {
        throw new Error(
          `Please upload ${MIN_GENERIC_LISTING_IMAGES}–${MAX_GENERIC_LISTING_IMAGES} images.`
        );
      }

      const imageCount = guided?.length ?? payload.images.length;
      const total = imageCount + 3;

      // 1. Create listing (metadata only — no image bytes through API, so no body size limit)
      setSubmitProgress({ current: 1, total });
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
          imageCount,
          hosel_serial_status: payload.hosel_serial_status ?? null,
          shaft: payload.shaft ?? payload.shaft ?? null,
          degree: payload.degree ?? null,
          shaft_flex: payload.shaftFlex ?? payload.shaft_flex ?? null,
          lie_angle: payload.lieAngle ?? payload.lie_angle ?? null,
          club_length: payload.clubLength ?? payload.club_length ?? null,
          shaft_weight: payload.shaftWeight ?? payload.shaft_weight ?? null,
          shaft_material: payload.shaftMaterial ?? payload.shaft_material ?? null,
          grip_brand: payload.gripBrand ?? payload.grip_brand ?? null,
          grip_model: payload.gripModel ?? payload.grip_model ?? null,
          grip_size: payload.gripSize ?? payload.grip_size ?? null,
          grip_condition: payload.gripCondition ?? payload.grip_condition ?? null,
          handed: payload.handed || null,
          item_type: payload.item_type ?? null,
          size: payload.size ?? null,
          colour: payload.colour ?? null,
          gender: payload.gender ?? null,
          listing_format: payload.listing_format ?? null,
          standard_spec_status: payload.standard_spec_status ?? null,
          customised_aspects: payload.customised_aspects ?? null,
          customised_other_note: payload.customised_other_note ?? null,
          iron_number: payload.iron_number ?? null,
          set_composition: payload.set_composition ?? null,
          bounce: payload.bounce ?? null,
          grind: payload.grind ?? null,
          head_number: payload.head_number ?? null,
          headcover_included: payload.headcover_included ?? null,
          spec_provenance: payload.spec_provenance ?? {},
          clubs: payload.clubs ?? null,
        }),
        signal,
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createData.error ?? "Failed to create listing");
      }
      const listingId = createData.id as string;
      if (!listingId) throw new Error("No listing id returned");

      if (guided?.length) {
        await uploadListingPhotos({
          listingId,
          photos: guided,
          hoselSerialStatus: payload.hosel_serial_status ?? null,
          signal,
          onProgress: (current, t) => setSubmitProgress({ current, total: t }),
        });
        router.push("/sell/success");
        return;
      }

      const images = payload.images;

      // 2. Get signed upload URLs (avoids Storage RLS; server authorizes via service role)
      setSubmitProgress({ current: 2, total });
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

        setSubmitProgress({ current: 3 + i, total });
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
      setSubmitProgress({ current: total, total });
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
      console.error("Listing submission failed", e);
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
          message =
            "We couldn't create your listing\n\nSomething went wrong while preparing your listing. Please try again.";
        }
      } else {
        message =
          "We couldn't create your listing\n\nSomething went wrong while preparing your listing. Please try again.";
      }
      alert(message);
    } finally {
      window.clearTimeout(timeoutId);
      abortRef.current = null;
      setSubmitting(false);
      setSubmitProgress(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">Sell your gear</h1>
      {formStep === 1 ? (
        <div className="mb-2">
          <p className="mt-2 text-mowing-green/80 text-sm">
            Your listing goes live as Coming Soon. We verify it before buyers can purchase.
          </p>
          <div className="mt-4">
            <SellJourneyStrip />
          </div>
        </div>
      ) : null}
      <ListingForm
        categories={ALL_CATEGORIES}
        brands={CLUB_BRANDS}
        conditions={CONDITIONS}
        initialCategory={initialCategory}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitProgress={submitProgress}
        clubCatalogue={clubCatalogue}
        clothingBrands={clothingBrands}
        onStepChange={setFormStep}
      />
    </div>
  );
}
