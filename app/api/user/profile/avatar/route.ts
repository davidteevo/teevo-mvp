import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const BUCKET = "avatars";
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;
  if (!file?.size || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please upload an image file (JPEG, PNG, etc.)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be under 4MB" }, { status: 400 });
  }

  const admin = createAdminClient();

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Image must be JPG, PNG, GIF or WebP" }, { status: 400 });
  }
  const path = `${user.id}/avatar.${ext}`;

  try {
    const storage = admin.storage.from(BUCKET);
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await storage.upload(path, buf, { contentType: file.type, upsert: true });
    if (uploadErr) {
      console.error("Avatar storage upload error:", uploadErr);
      const msg = uploadErr.message ?? "Upload failed";
      return NextResponse.json(
        { error: msg.includes("Bucket") ? "Storage bucket 'avatars' not found. Create it in Supabase Dashboard → Storage (set to Public)." : msg },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("Avatar upload error:", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json(
      { error: msg.includes("Bucket") || msg.includes("bucket") ? "Storage bucket 'avatars' not found. Create it in Supabase Dashboard → Storage (set to Public)." : msg },
      { status: 500 }
    );
  }

  const { error } = await admin
    .from("users")
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return NextResponse.json({ ok: true, url });
}
