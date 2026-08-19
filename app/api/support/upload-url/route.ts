import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * POST /api/support/upload-url
 * Body: { contentType: string }
 * Returns a signed upload URL and storage path for a support attachment.
 * Max file size is enforced at the storage bucket policy level (5 MB).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const contentType =
    typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPEG, PNG, GIF, or WebP image." },
      { status: 400 }
    );
  }

  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const objectPath = `${user.id}/${randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { data: signData, error: signErr } = await admin.storage
    .from("support-attachments")
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (signErr || !signData?.token) {
    console.error("support upload-url error:", signErr);
    return NextResponse.json(
      { error: signErr?.message ?? "Failed to create upload URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ path: objectPath, token: signData.token });
}
