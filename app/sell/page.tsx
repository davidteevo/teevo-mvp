"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ListingForm, type SubmitStatus } from "@/components/listing/ListingForm";

const LISTINGS_BUCKET = "listings";
const SUBMIT_TIMEOUT_MS = 120_000; // 2 min total for create + upload URLs + uploads + images

const CATEGORIES = ["Driver", "Irons", "Wedges", "Putter", "Apparel", "Bag"] as const;
const BRANDS = [
  "Titleist", "Callaway", "TaylorMade", "Ping", "Cobra", "Mizuno", "Srixon", "Wilson", "Other",
];
const CONDITIONS = ["New", "Excellent", "Good", "Used"] as const;
const PARCEL_PRESETS = ["GOLF_DRIVER", "IRON_SET", "PUTTER", "SMALL_ITEM"] as const;

export default function SellPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
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
    model: string;
    condition: string;
    description: string;
    price: string;
    parcelPreset: string;
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
      if (images.length < 3 || images.length > 6) {
        throw new Error("Upload 3–6 images");
      }

      // 1. Create listing (metadata only — no image bytes through API, so no body size limit)
      setSubmitStatus({ phase: "creating" });
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
          parcelPreset: payload.parcelPreset || "SMALL_ITEM",
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
      if (!Array.isArray(uploads) || uploads.length !== images.length) {
        throw new Error("Invalid upload URLs response");
      }

      // 3. Upload each image via signed URL (no RLS check on client)
      const supabase = createClient();
      const paths: string[] = [];
      const allowedExt = ["jpg", "jpeg", "png", "gif", "webp"];
      const total = images.length;
      for (let i = 0; i < images.length; i++) {
        if (signal.aborted) throw new Error("Upload cancelled");
        setSubmitStatus({ phase: "uploading", current: i + 1, total });
        const file = images[i];
        if (!file?.size) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        if (!allowedExt.includes(ext)) continue;
        const { path, token } = uploads[i];
        // #region agent log
        fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"1d9b73"},body:JSON.stringify({sessionId:"1d9b73",runId:"upload",hypothesisId:"H1_H3_H5",location:"sell/page.tsx:upload-loop",message:"before uploadToSignedUrl",data:{index:i,path:path,hasToken:!!token,tokenLen:typeof token==="string"?token.length:0,fileSize:file?.size,signalAborted:signal.aborted},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const { error: uploadErr } = await supabase.storage
          .from(LISTINGS_BUCKET)
          .uploadToSignedUrl(path, token, file, {
            contentType: file.type || "image/jpeg",
          });
        // #region agent log
        fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"1d9b73"},body:JSON.stringify({sessionId:"1d9b73",runId:"upload",hypothesisId:"H1_H2",location:"sell/page.tsx:after-upload",message:"uploadToSignedUrl returned",data:{index:i,hasError:!!uploadErr,errorMessage:uploadErr?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
      setSubmitStatus({ phase: "saving" });
      const imagesRes = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
        signal,
      });
      const imagesData = await imagesRes.json().catch(() => ({}));
      if (!imagesRes.ok) {
        throw new Error(imagesData.error ?? "Failed to save image list");
      }

      router.push("/sell/success");
    } catch (e) {
      // #region agent log
      fetch("http://127.0.0.1:7439/ingest/447ae8c2-01d2-435d-9b96-01ac58736e1d",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"1d9b73"},body:JSON.stringify({sessionId:"1d9b73",runId:"upload",hypothesisId:"H2",location:"sell/page.tsx:catch",message:"handleSubmit catch",data:{name:e instanceof Error?e.name:"",message:e instanceof Error?e.message:String(e)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
      <h1 className="text-2xl font-bold text-mowing-green">List an item</h1>
      <p className="mt-2 text-mowing-green/80 text-sm">
        Under 2 minutes. We’ll verify your listing before it goes live.
      </p>
      <ListingForm
        categories={CATEGORIES}
        brands={BRANDS}
        conditions={CONDITIONS}
        parcelPresets={PARCEL_PRESETS}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitStatus={submitStatus}
      />
    </div>
  );
}
