"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ListingForm, type SubmitStatus } from "@/components/listing/ListingForm";
import { ALL_CATEGORIES, CONDITIONS } from "@/lib/listing-categories";
import { compressListingMain, compressListingThumb } from "@/lib/image-compression";
import type { ClubCatalogue } from "@/lib/club-catalogue";

const LISTINGS_BUCKET = "listings";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUBMIT_TIMEOUT_MS = 120_000;

const CLUB_BRANDS = [
  "Titleist", "Callaway", "TaylorMade", "Ping", "Cobra", "Mizuno", "Srixon", "Wilson", "Other",
];

type Step = 1 | 2 | 3 | 4;

type SellerInfo = {
  id: string;
  email: string;
  first_name: string | null;
  surname: string | null;
};

type ListingPayload = {
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
  lieAngle?: string;
  clubLength?: string;
  shaftWeight?: string;
  shaftMaterial?: string;
  gripBrand?: string;
  gripModel?: string;
  gripSize?: string;
  gripCondition?: string;
  handed?: "left" | "right";
  item_type?: string | null;
  size?: string | null;
  colour?: string | null;
  images: File[];
};

interface CreateListingContentProps {
  clubCatalogue: ClubCatalogue;
  clothingBrands?: string[];
}

export function CreateListingContent({ clubCatalogue, clothingBrands }: CreateListingContentProps) {
  const [step, setStep] = useState<Step>(1);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [listingPayload, setListingPayload] = useState<ListingPayload | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);
  const [success, setSuccess] = useState<{ listingId: string; notificationSent: boolean } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleLookup = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setLookupError("Enter an email address");
      return;
    }
    setLookupError(null);
    setCreateUserError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/admin/sellers/lookup?email=${encodeURIComponent(trimmed)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLookupError(data.error ?? "Lookup failed");
        return;
      }
      if (data.found && data.user) {
        setSeller({
          id: data.user.id,
          email: data.user.email,
          first_name: data.user.first_name ?? null,
          surname: data.user.surname ?? null,
        });
        setStep(2);
      } else {
        setLookupError("No user found with this email. Create a new user below.");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreateUser = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setCreateUserError("Enter an email address");
      return;
    }
    setLookupError(null);
    setCreateUserError(null);
    setCreateUserLoading(true);
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.existing_user_id) {
        setSeller({
          id: data.existing_user_id,
          email: data.user?.email ?? trimmed,
          first_name: (data.user?.first_name ?? firstName.trim()) || null,
          surname: (data.user?.surname ?? lastName.trim()) || null,
        });
        setStep(2);
        return;
      }
      if (!res.ok) {
        setCreateUserError(data.error ?? "Failed to create user");
        return;
      }
      if (data.user_id) {
        setSeller({
          id: data.user_id,
          email: trimmed,
          first_name: firstName.trim() || null,
          surname: lastName.trim() || null,
        });
        setStep(2);
      }
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleListingFormSubmit = (payload: ListingPayload) => {
    setListingPayload(payload);
    setStep(3);
  };

  const handlePublish = async () => {
    if (!seller || !listingPayload) return;
    const images = listingPayload.images;
    if (images.length < 5 || images.length > 6) {
      setSubmitError("Please upload 5 or 6 images.");
      return;
    }
    const pricePence = Math.round(parseFloat(listingPayload.price) * 100);
    if (Number.isNaN(pricePence) || pricePence <= 0) {
      setSubmitError("Invalid price.");
      return;
    }

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const timeoutId = window.setTimeout(() => abortRef.current?.abort(), SUBMIT_TIMEOUT_MS);
    setSubmitting(true);
    setSubmitError(null);
    setStep(4);

    try {
      setSubmitStatus({ phase: "creating" });
      const createRes = await fetch("/api/admin/listings/on-behalf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_user_id: seller.id,
          admin_notes: adminNotes.trim() || null,
          category: listingPayload.category,
          brand: listingPayload.brand,
          model: listingPayload.model ?? null,
          title: listingPayload.title?.trim() || null,
          condition: listingPayload.condition,
          description: listingPayload.description || null,
          price: pricePence,
          imageCount: images.length,
          shaft: listingPayload.shaft || null,
          degree: listingPayload.degree || null,
          shaft_flex: listingPayload.shaftFlex || null,
          lie_angle: listingPayload.lieAngle || null,
          club_length: listingPayload.clubLength || null,
          shaft_weight: listingPayload.shaftWeight || null,
          shaft_material: listingPayload.shaftMaterial || null,
          grip_brand: listingPayload.gripBrand || null,
          grip_model: listingPayload.gripModel || null,
          grip_size: listingPayload.gripSize || null,
          grip_condition: listingPayload.gripCondition || null,
          handed: listingPayload.handed || null,
          item_type: listingPayload.item_type ?? null,
          size: listingPayload.size ?? null,
          colour: listingPayload.colour ?? null,
        }),
        signal,
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createData.error ?? "Failed to create listing");
      }
      const listingId = createData.id as string;
      const notificationSent = createData.notification_sent === true;
      if (!listingId) throw new Error("No listing id returned");

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
      const expectedUploads = images.length * 2;
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
        throw new Error("At least 5 valid images are required.");
      }

      setSubmitStatus({ phase: "saving" });
      const imagesRes = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: mainPaths }),
        signal,
      });
      if (!imagesRes.ok) {
        const imagesData = await imagesRes.json().catch(() => ({}));
        throw new Error(imagesData.error ?? "Failed to save image list");
      }

      setSuccess({ listingId, notificationSent });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.name === "AbortError"
            ? "Request took too long. Please try again."
            : e.message
          : "Something went wrong.";
      setSubmitError(message);
    } finally {
      window.clearTimeout(timeoutId);
      abortRef.current = null;
      setSubmitting(false);
      setSubmitStatus(null);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-6">
          <h2 className="text-lg font-semibold text-mowing-green">Listing created</h2>
          <ul className="mt-3 space-y-1 text-sm text-mowing-green/80">
            <li>Listing created and published (verified)</li>
            <li>Images uploaded</li>
            {success.notificationSent && <li>Notification email sent to seller</li>}
            {!success.notificationSent && seller && (
              <li className="text-amber-700 dark:text-amber-400">Notification email could not be sent; listing is still live.</li>
            )}
          </ul>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/admin/listings/${success.listingId}`}
              className="inline-flex items-center rounded-lg bg-mowing-green px-4 py-2 text-sm font-medium text-white hover:bg-mowing-green/90"
            >
              View listing
            </Link>
            <Link
              href="/admin/create-listing"
              className="inline-flex items-center rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-sm font-medium text-mowing-green hover:bg-mowing-green/5"
            >
              Create another
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-mowing-green">Create listing on behalf of seller</h1>
        <p className="mt-1 text-mowing-green/80 text-sm">
          Find or create a seller, then add a listing. The listing will be published (verified) under their account.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-mowing-green/70">
        <span className={step >= 1 ? "font-medium text-mowing-green" : ""}>1. Seller</span>
        <span>→</span>
        <span className={step >= 2 ? "font-medium text-mowing-green" : ""}>2. Listing</span>
        <span>→</span>
        <span className={step >= 3 ? "font-medium text-mowing-green" : ""}>3. Review</span>
        {step === 4 && <span className="font-medium text-mowing-green">4. Publishing…</span>}
      </div>

      {/* Step 1: Seller */}
      {step === 1 && (
        <div className="rounded-xl border border-par-3-punch/20 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-mowing-green">Seller</h2>
          <p className="text-sm text-mowing-green/70">Search by email or create a new user.</p>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-mowing-green mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-mowing-green"
                placeholder="seller@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-mowing-green mb-1">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-mowing-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mowing-green mb-1">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-mowing-green"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-mowing-green mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-mowing-green"
              />
            </div>
          </div>
          {lookupError && <p className="text-sm text-amber-600">{lookupError}</p>}
          {createUserError && <p className="text-sm text-red-600">{createUserError}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading || createUserLoading}
              className="rounded-lg bg-mowing-green px-4 py-2 text-sm font-medium text-white hover:bg-mowing-green/90 disabled:opacity-50"
            >
              {lookupLoading ? "Searching…" : "Find user"}
            </button>
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={lookupLoading || createUserLoading}
              className="rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 disabled:opacity-50"
            >
              {createUserLoading ? "Creating…" : "Create user & continue"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Listing details */}
      {step === 2 && seller && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10 p-4">
            <p className="text-sm font-medium text-mowing-green">Listing for</p>
            <p className="text-sm text-mowing-green/80">
              {[seller.first_name, seller.surname].filter(Boolean).join(" ") || "—"} ({seller.email})
            </p>
            <button
              type="button"
              onClick={() => { setSeller(null); setStep(1); }}
              className="mt-2 text-sm text-par-3-punch hover:underline"
            >
              Change seller
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">Admin notes (optional, for audit)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full rounded-lg border border-mowing-green/20 px-3 py-2 text-mowing-green"
              rows={2}
              placeholder="e.g. Sourced via Instagram DM"
            />
          </div>
          <ListingForm
            categories={ALL_CATEGORIES}
            brands={CLUB_BRANDS}
            conditions={CONDITIONS}
            onSubmit={handleListingFormSubmit}
            submitting={false}
            clubCatalogue={clubCatalogue}
            clothingBrands={clothingBrands}
          />
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && seller && listingPayload && (
        <div className="rounded-xl border border-par-3-punch/20 bg-white p-6 space-y-6">
          <h2 className="text-lg font-semibold text-mowing-green">Review</h2>
          <div>
            <p className="text-sm font-medium text-mowing-green/70">Seller</p>
            <p className="text-mowing-green">
              {[seller.first_name, seller.surname].filter(Boolean).join(" ") || "—"} · {seller.email}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-mowing-green/70">Listing</p>
            <p className="text-mowing-green">
              {listingPayload.title || listingPayload.brand || listingPayload.category} · {listingPayload.category} · £{listingPayload.price} · {listingPayload.images.length} images
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-mowing-green/30 px-4 py-2 text-sm font-medium text-mowing-green hover:bg-mowing-green/5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className="rounded-lg bg-mowing-green px-4 py-2 text-sm font-medium text-white hover:bg-mowing-green/90 disabled:opacity-50"
            >
              Publish listing
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Submitting */}
      {step === 4 && (
        <div className="rounded-xl border border-par-3-punch/20 bg-white p-6">
          {submitStatus && (
            <p className="text-mowing-green">
              {submitStatus.phase === "creating" && "Creating listing…"}
              {submitStatus.phase === "upload_urls" && "Preparing upload…"}
              {submitStatus.phase === "compressing" &&
                `Compressing image ${submitStatus.current ?? 0} of ${submitStatus.total ?? 0}…`}
              {submitStatus.phase === "uploading" &&
                `Uploading image ${submitStatus.current ?? 0} of ${submitStatus.total ?? 0}…`}
              {submitStatus.phase === "saving" && "Saving images…"}
            </p>
          )}
          {submitError && (
            <p className="mt-2 text-sm text-red-600">{submitError}</p>
          )}
          {submitError && (
            <button
              type="button"
              onClick={() => { setStep(3); setSubmitError(null); }}
              className="mt-3 rounded-lg border border-mowing-green/30 px-4 py-2 text-sm font-medium text-mowing-green"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
