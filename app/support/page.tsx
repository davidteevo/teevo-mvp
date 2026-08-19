"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { Suspense } from "react";

const CATEGORIES = [
  "Buying",
  "Selling",
  "Listing",
  "Payment",
  "Delivery",
  "Account",
  "Report a problem",
  "Something else",
] as const;

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>}>
      <SupportContent />
    </Suspense>
  );
}

function SupportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Prefill category from query param (e.g. ?category=Buying)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && CATEGORIES.includes(cat as (typeof CATEGORIES)[number])) {
      setCategory(cat);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/support")}`);
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>
    );
  }

  function handleFile(selected: File | null) {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFileError("Please upload a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File must be ${MAX_FILE_SIZE_MB} MB or smaller.`);
      return;
    }
    setFile(selected);
  }

  async function uploadFile(selectedFile: File): Promise<string | null> {
    const urlRes = await fetch("/api/support/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: selectedFile.type }),
    });
    if (!urlRes.ok) {
      const err = await urlRes.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to get upload URL.");
    }
    const { path, token } = await urlRes.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) throw new Error("Storage URL not configured.");

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/upload/sign/support-attachments/${path}?token=${encodeURIComponent(token)}`,
      {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      }
    );

    if (!uploadRes.ok) {
      throw new Error("Failed to upload file.");
    }

    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!category) { setSubmitError("Please select a category."); return; }
    if (!subject.trim()) { setSubmitError("Please enter a subject."); return; }
    if (!message.trim()) { setSubmitError("Please tell us what's happened."); return; }

    setSubmitting(true);
    setUploading(false);

    let attachmentPath: string | null = null;
    try {
      if (file) {
        setUploading(true);
        attachmentPath = await uploadFile(file);
        setUploading(false);
      }

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          attachmentPath,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setUploading(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-5">
          <CheckCircle className="mx-auto h-14 w-14 text-mowing-green" />
          <h1 className="text-2xl font-bold text-mowing-green">We&apos;ve got it 👍</h1>
          <p className="text-mowing-green/80">
            Your message has been sent to the Teevo team. We&apos;ll get back to you at{" "}
            <strong>{user.email}</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-mowing-green/20 px-5 py-2.5 text-sm font-medium text-mowing-green hover:bg-mowing-green/5 transition-colors"
            >
              Go back
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setCategory("");
                setSubject("");
                setMessage("");
                setFile(null);
              }}
              className="rounded-xl bg-mowing-green px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-mowing-green">How can we help? 👋</h1>
        <p className="mt-1 text-sm text-mowing-green/70">
          Send us a message and we&apos;ll get back to you as soon as we can.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-mowing-green mb-1.5">
            Category <span aria-hidden>*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full rounded-xl border border-par-3-punch/40 bg-white px-3.5 py-3 text-sm text-mowing-green focus:border-mowing-green focus:outline-none focus:ring-2 focus:ring-mowing-green/20 appearance-none"
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-mowing-green mb-1.5">
            Subject <span aria-hidden>*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
            placeholder="Brief summary of your issue"
            className="w-full rounded-xl border border-par-3-punch/40 bg-white px-3.5 py-3 text-sm text-mowing-green placeholder:text-mowing-green/40 focus:border-mowing-green focus:outline-none focus:ring-2 focus:ring-mowing-green/20"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-mowing-green mb-1.5">
            Tell us what&apos;s happened <span aria-hidden>*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            required
            rows={6}
            placeholder="Describe your issue in as much detail as you can…"
            className="w-full rounded-xl border border-par-3-punch/40 bg-white px-3.5 py-3 text-sm text-mowing-green placeholder:text-mowing-green/40 focus:border-mowing-green focus:outline-none focus:ring-2 focus:ring-mowing-green/20 resize-y min-h-[120px]"
          />
          {message.length > 4500 && (
            <p className="mt-1 text-xs text-mowing-green/50 text-right">
              {message.length} / 5000
            </p>
          )}
        </div>

        {/* Attachment */}
        <div>
          <p className="block text-sm font-medium text-mowing-green mb-1.5">
            Screenshot / Photo{" "}
            <span className="font-normal text-mowing-green/50">(optional)</span>
          </p>

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-par-3-punch/30 bg-mowing-green/5 px-3.5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-mowing-green truncate">{file.name}</p>
                <p className="text-xs text-mowing-green/50">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setFileError(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="shrink-0 p-1 rounded-lg text-mowing-green/60 hover:text-mowing-green hover:bg-mowing-green/10 transition-colors"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-par-3-punch/40 px-3.5 py-3.5 text-sm text-mowing-green/70 hover:border-mowing-green/40 hover:bg-mowing-green/5 transition-colors"
            >
              <Upload className="h-4 w-4 shrink-0" />
              Attach a screenshot or photo
              <span className="ml-auto text-xs text-mowing-green/40">JPEG, PNG, GIF, WebP · max 5 MB</span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            aria-label="Upload screenshot"
          />
          {fileError && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {fileError}
            </p>
          )}
        </div>

        {/* Error */}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-xl bg-mowing-green px-5 py-3.5 text-sm font-semibold text-white hover:opacity-90 active:opacity-80 disabled:opacity-60 transition-opacity"
        >
          {uploading ? "Uploading…" : submitting ? "Sending…" : "Send to Teevo Support"}
        </button>
      </form>
    </div>
  );
}
