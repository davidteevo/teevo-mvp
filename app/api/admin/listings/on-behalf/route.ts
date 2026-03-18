import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { categoryToParcelPreset } from "@/lib/shippo";
import {
  ALL_CATEGORIES,
  CONDITIONS,
  CLOTHING_TYPES,
  ACCESSORY_ITEM_TYPES,
  ACCESSORY_BRANDS,
  getSizeOptionsForClothingType,
  isClothingCategory,
  isAccessoriesCategory,
} from "@/lib/listing-categories";
import { assignFoundingSellerRankIfEligible } from "@/lib/founding-seller-rank";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES_SET = new Set<string>(ALL_CATEGORIES);
const ALLOWED_CONDITIONS_SET = new Set<string>(CONDITIONS);
const CLOTHING_TYPES_SET = new Set<string>(CLOTHING_TYPES);
const ACCESSORY_ITEM_TYPES_SET = new Set<string>(ACCESSORY_ITEM_TYPES);
const ACCESSORY_BRANDS_SET = new Set<string>(ACCESSORY_BRANDS);

/**
 * POST /api/admin/listings/on-behalf
 * Admin-only. Body: owner_user_id, admin_notes?, plus same listing fields as POST /api/listings.
 * Creates listing with user_id = owner_user_id, created_by_admin_id, created_on_behalf, status = 'verified'.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("users").select("role").eq("id", adminUser.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const owner_user_id = typeof body.owner_user_id === "string" ? body.owner_user_id.trim() : "";
    const admin_notes = typeof body.admin_notes === "string" ? body.admin_notes.trim() || null : null;

    if (!owner_user_id) {
      return NextResponse.json({ error: "owner_user_id is required" }, { status: 400 });
    }

    const { data: owner } = await admin.from("users").select("id, email, created_by_admin").eq("id", owner_user_id).single();
    if (!owner) {
      return NextResponse.json({ error: "Owner user not found" }, { status: 400 });
    }

    const category = body.category as string;
    const brand = body.brand as string;
    const modelRaw = body.model;
    const model =
      typeof modelRaw === "string" && modelRaw.trim() !== ""
        ? modelRaw.trim()
        : null;
    const title = typeof body.title === "string" ? body.title.trim() || null : null;
    const condition = body.condition as string;
    const description = (body.description as string) || null;
    const shaft = typeof body.shaft === "string" ? body.shaft.trim() || null : null;
    const degree = typeof body.degree === "string" ? body.degree.trim() || null : null;
    const shaft_flex =
      typeof body.shaft_flex === "string" ? body.shaft_flex.trim() || null : null;
    const lie_angle = typeof body.lie_angle === "string" ? body.lie_angle.trim() || null : null;
    const club_length = typeof body.club_length === "string" ? body.club_length.trim() || null : null;
    const shaft_weight =
      typeof body.shaft_weight === "string" ? body.shaft_weight.trim() || null : null;
    const shaft_material =
      typeof body.shaft_material === "string" ? body.shaft_material.trim() || null : null;
    const grip_brand = typeof body.grip_brand === "string" ? body.grip_brand.trim() || null : null;
    const grip_model = typeof body.grip_model === "string" ? body.grip_model.trim() || null : null;
    const grip_size = typeof body.grip_size === "string" ? body.grip_size.trim() || null : null;
    const grip_condition =
      typeof body.grip_condition === "string" ? body.grip_condition.trim() || null : null;
    const handedRaw = body.handed;
    const handed =
      handedRaw === "left" || handedRaw === "right" ? handedRaw : null;
    const item_type =
      typeof body.item_type === "string" ? body.item_type.trim() || null : null;
    const size = typeof body.size === "string" ? body.size.trim() || null : null;
    const colour =
      typeof body.colour === "string" ? body.colour.trim() || null : null;
    const price = typeof body.price === "number" ? body.price : parseInt(String(body.price), 10);
    const imageCount =
      typeof body.imageCount === "number" ? body.imageCount : parseInt(String(body.imageCount), 10);

    if (!category || !ALLOWED_CATEGORIES_SET.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!condition || !ALLOWED_CONDITIONS_SET.has(condition)) {
      return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    if (!Number.isFinite(imageCount) || imageCount < 5 || imageCount > 6) {
      return NextResponse.json({ error: "Upload 5–6 images" }, { status: 400 });
    }

    if (isClothingCategory(category)) {
      if (!brand || typeof brand !== "string" || !brand.trim()) {
        return NextResponse.json({ error: "Invalid brand for clothing" }, { status: 400 });
      }
      if (!item_type || !CLOTHING_TYPES_SET.has(item_type)) {
        return NextResponse.json({ error: "Invalid clothing type" }, { status: 400 });
      }
      const allowedSizes = getSizeOptionsForClothingType(item_type);
      if (!size || !allowedSizes.includes(size)) {
        return NextResponse.json({ error: "Invalid size for clothing type" }, { status: 400 });
      }
    } else if (isAccessoriesCategory(category)) {
      if (!brand || !ACCESSORY_BRANDS_SET.has(brand)) {
        return NextResponse.json({ error: "Invalid brand for accessories" }, { status: 400 });
      }
      if (!item_type || !ACCESSORY_ITEM_TYPES_SET.has(item_type)) {
        return NextResponse.json({ error: "Invalid item type for accessories" }, { status: 400 });
      }
    } else {
      if (!brand) {
        return NextResponse.json({ error: "Brand is required" }, { status: 400 });
      }
      if (!model) {
        return NextResponse.json({ error: "Model is required for this category" }, { status: 400 });
      }
    }

    const parcel_preset = categoryToParcelPreset(category);

    const { data: listing, error: listError } = await admin
      .from("listings")
      .insert({
        user_id: owner_user_id,
        category,
        brand,
        model,
        title: title ?? null,
        condition,
        description,
        shaft,
        degree,
        shaft_flex,
        lie_angle,
        club_length,
        shaft_weight,
        shaft_material,
        grip_brand,
        grip_model,
        grip_size,
        grip_condition,
        handed,
        item_type: item_type ?? null,
        size: size ?? null,
        colour: colour ?? null,
        price,
        parcel_preset,
        status: "verified",
        created_by_admin_id: adminUser.id,
        created_on_behalf: true,
      })
      .select("id")
      .single();

    if (listError || !listing) {
      return NextResponse.json({ error: listError?.message ?? "Failed to create listing" }, { status: 500 });
    }

    await assignFoundingSellerRankIfEligible(admin, owner_user_id);

    await admin.from("admin_actions").insert({
      admin_id: adminUser.id,
      action: "create_listing_on_behalf",
      target_type: "listing",
      target_id: listing.id,
      payload: { target_user_id: owner_user_id, admin_notes },
    });

    // Optional: send "account + listing created" email if owner was created by admin
    let notification_sent = false;
    if (owner.created_by_admin) {
      try {
        const { ensureEmailSent, EmailTriggerType } = await import("@/lib/email-triggers");
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const subtitle = [brand, title || model, category].filter(Boolean).join(" · ");
        notification_sent = await ensureEmailSent(admin, {
          emailType: EmailTriggerType.ACCOUNT_AND_LISTING_CREATED,
          referenceId: listing.id,
          referenceType: "listing",
          recipientId: owner_user_id,
          to: owner.email,
          subject: "Your Teevo listing is live",
          type: "alert",
          variables: {
            title: "Your Teevo account and listing are ready",
            subtitle: subtitle || "Your listing",
            body: "We've created a listing for you on Teevo. Set your password using the link we sent you, then log in to manage your listing.",
            cta_link: appUrl ? `${appUrl}/login` : "#",
            cta_text: "Log in",
          },
        });
      } catch (e) {
        console.error("Failed to send account+listing email:", e);
      }
    }

    return NextResponse.json({
      id: listing.id,
      notification_sent,
    });
  } catch (e) {
    console.error("POST /api/admin/listings/on-behalf error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
