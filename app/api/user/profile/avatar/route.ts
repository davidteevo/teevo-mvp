import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const BUCKET = "avatars";

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

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Image must be JPG, PNG, GIF or WebP" }, { status: 400 });
  }
  const path = `${user.id}/avatar.${ext}`;

  try {
    const storage = admin.storage.from(BUCKET);
    const buf = Buffer.from(await file.arrayBuffer());
    await storage.upload(path, buf, { contentType: file.type, upsert: true });
  } catch (e) {
    console.error("Avatar upload error:", e);
    return NextResponse.json(
      { error: "Upload failed. In Supabase Dashboard → Storage, create a bucket named 'avatars' and set it to Public." },
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
