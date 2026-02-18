# Request body size on Netlify

## The limit

Netlify’s serverless runtime has a **~6 MB request body limit** for incoming requests. For binary uploads (e.g. images), encoding adds overhead so the practical limit is lower (~4.5 MB). This limit is **not configurable** in `netlify.toml` or via environment variables on the standard plan.

So when users submit a listing with 3–6 images, the combined size can exceed the limit and the request fails (often as a non-JSON response, e.g. 413 or an error page).

## What we already do

- **Next.js** – In `next.config.js`, `experimental.serverActions.bodySizeLimit` is set to `"10mb"`. That applies to Server Actions; Netlify still enforces its own ~6 MB limit before the request reaches your app.
- **Sell page** – The client shows clearer errors when the response isn’t JSON (e.g. “Upload too large” for 413).

## Options

### 1. Keep uploads under the limit (simplest)

- Ask users to use **3–4 images** and **smaller files** (e.g. under ~1 MB each, or 1–1.5 MB total per image so 3–6 images stay under ~6 MB total).
- You can add client-side checks (e.g. total size or “max 1 MB per image”) and show a message before submit.

### 2. Upload images directly to Supabase from the browser (recommended for large files)

- Don’t send image bytes through your API. Instead:
  - API creates the listing row and returns a listing ID (and optionally presigned URLs or a policy).
  - Client uploads each image **directly to Supabase Storage** (e.g. using the Supabase client and RLS, or presigned URLs).
  - Client then calls a small API to attach the stored image paths to the listing (or the client uses a single “finalize” API with only metadata).
- This avoids the 6 MB Netlify limit because the API only receives JSON (listing fields + image paths).

### 3. Netlify configuration (what you can set)

There is **no** Netlify setting to increase the request body size. You can only:

- In **Site settings → Build & deploy → Environment**: set `NODE_OPTIONS` (e.g. `--max-http-headers-size=16384`) if you hit **header** size limits. This does **not** change the body limit.
- In **netlify.toml** you can mirror that under `[build.environment]` (see the commented example there). Again, this does not increase body size.

### 4. Netlify Enterprise / custom AWS

For higher limits, Netlify typically requires Enterprise or running functions on your own AWS account. That’s only relevant for much larger uploads and higher scale.

## Summary

- **Body size on Netlify cannot be increased** via `netlify.toml` or build environment.
- Use **smaller/fewer images** or **direct-to-Supabase uploads** so the API only receives metadata and stays under the ~6 MB limit.

---

## Direct upload implementation (current approach)

The app now uses **direct-to-Supabase** image uploads:

1. Client sends listing **metadata only** (JSON) to `POST /api/listings` → API creates the row and returns `{ id }`.
2. Client uploads each image **directly** to Supabase Storage (`listings/{listing_id}/{i}.{ext}`) using the browser Supabase client.
3. Client calls `POST /api/listings/[id]/images` with `{ paths: [...] }` to register the image paths.

So the API never receives image bytes and is not subject to the 6 MB body limit.

### Storage policy required

For step 2 to work, the **listings** bucket must allow authenticated users to upload into a folder whose name is a listing ID they own. In Supabase Dashboard go to **Storage** → **listings** bucket → **Policies**, and add:

**Policy name:** `Users can upload to own listing folder`  
**Allowed operation:** INSERT  
**Target roles:** `authenticated`  
**WITH CHECK expression (SQL):**

```sql
bucket_id = 'listings'
AND (SELECT user_id FROM public.listings WHERE id = (split_part(name, '/', 1))::uuid) = auth.uid()
```

Or run in **SQL Editor**:

```sql
-- Allow authenticated users to upload into listings/{listing_id}/ only when they own that listing
CREATE POLICY "Users can upload to own listing folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  AND (SELECT user_id FROM public.listings WHERE id = (split_part(name, '/', 1))::uuid) = auth.uid()
);
```

Ensure the **listings** bucket exists and is **Public** (so listing images can be viewed without signed URLs).
