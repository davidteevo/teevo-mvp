"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing/ListingForm";

const LISTINGS_BUCKET = "listings";

const CATEGORIES = ["Driver", "Irons", "Wedges", "Putter", "Apparel", "Bag"] as const;
const BRANDS = [
  "Titleist", "Callaway", "TaylorMade", "Ping", "Cobra", "Mizuno", "Srixon", "Wilson", "Other",
];
const CONDITIONS = ["New", "Excellent", "Good", "Used"] as const;

export default function SellPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
    model: string;
    condition: string;
    description: string;
    price: string;
    images: File[];
  }) => {
    setSubmitting(true);
    try {
      const pricePence = Math.round(parseFloat(payload.price) * 100);
      if (Number.isNaN(pricePence) || pricePence <= 0) {
        throw new Error("Invalid price");
      }
      const images = payload.images;
      if (images.length < 3 || images.length > 6) {
        throw new Error("Upload 3–6 images");
      }

      // 1. Create listing (metadata only — no image bytes through API, so no body size limit)
      const createRes = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: payload.category,
          brand: payload.brand,
          model: payload.model,
          condition: payload.condition,
          description: payload.description || null,
          price: pricePence,
          imageCount: images.length,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createData.error ?? "Failed to create listing");
      }
      const listingId = createData.id as string;
      if (!listingId) throw new Error("No listing id returned");

      // 2. Get signed upload URLs (avoids Storage RLS; server authorizes via service role)
      const urlsRes = await fetch(`/api/listings/${listingId}/upload-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: images.length }),
      });
      const urlsData = await urlsRes.json().catch(() => ({}));
      if (!urlsRes.ok) {
        throw new Error(urlsData.error ?? "Failed to get upload URLs");
      }
      const uploads = urlsData.uploads as { path: string; token: string }[] | undefined;
      if (!Array.isArray(uploads) || uploads.length !== images.length) {
        throw new Error("Invalid upload URLs response");
      }

      // 3. Upload each image via signed URL (no RLS check on client)
      const supabase = createClient();
      const paths: string[] = [];
      const allowedExt = ["jpg", "jpeg", "png", "gif", "webp"];
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        if (!file?.size) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        if (!allowedExt.includes(ext)) continue;
        const { path, token } = uploads[i];
        const { error: uploadErr } = await supabase.storage
          .from(LISTINGS_BUCKET)
          .uploadToSignedUrl(path, token, file, {
            contentType: file.type || "image/jpeg",
          });
        if (uploadErr) {
          throw new Error(
            uploadErr.message ?? `Image ${i + 1} upload failed. Try again.`
          );
        }
        paths.push(path);
      }

      if (paths.length < 3) {
        throw new Error("At least 3 valid images (JPG, PNG, GIF, WebP) are required.");
      }

      // 4. Register image paths with the API
      const imagesRes = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      const imagesData = await imagesRes.json().catch(() => ({}));
      if (!imagesRes.ok) {
        throw new Error(imagesData.error ?? "Failed to save image list");
      }

      router.push("/sell/success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-mowing-green">List an item</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Under 2 minutes. We’ll verify your listing before it goes live.
      </p>
      <ListingForm
        categories={CATEGORIES}
        brands={BRANDS}
        conditions={CONDITIONS}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
