import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { categoryToParcelPreset } from "@/lib/shippo";
import { ensureEmailSent, EmailTriggerType } from "@/lib/email-triggers";
import { notifyListingReviewRequired } from "@/lib/notification-events";
import { adminListingUrl } from "@/lib/notifications";
import { getAdminAlertEmails } from "@/lib/fulfilment-emails";
import {
  ALL_CATEGORIES,
  CONDITIONS,
  CLOTHING_TYPES,
  ACCESSORY_ITEM_TYPES,
  getSizeOptionsForClothingType,
  isClothingCategory,
  isAccessoriesCategory,
} from "@/lib/listing-categories";
import {
  deriveTitleIfMissing,
  parseClubSpecsFromBody,
  replaceListingClubs,
  validateNewGolfListingSpecs,
} from "@/lib/club-specs/server";
import { isGolfEquipmentCategory } from "@/lib/club-specs/schemas";
import { parseHoselSerialStatus, validateListingImageCount } from "@/lib/listing-photos/validate";
import { assertUserNotSuspended } from "@/lib/user-account-status";
export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES_SET = new Set<string>(ALL_CATEGORIES);
const ALLOWED_CONDITIONS_SET = new Set<string>(CONDITIONS);
const CLOTHING_TYPES_SET = new Set<string>(CLOTHING_TYPES);
const ACCESSORY_ITEM_TYPES_SET = new Set<string>(ACCESSORY_ITEM_TYPES);
/**
 * POST /api/listings
 * Body: JSON listing fields + optional club specs / clubs[]
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminForStatus = createAdminClient();
    const suspended = await assertUserNotSuspended(adminForStatus, user.id);
    if (suspended) return suspended;

    const body = await request.json().catch(() => ({}));
    const category = body.category as string;
    const brand = body.brand as string;
    const modelRaw = body.model;
    const model =
      typeof modelRaw === "string" && modelRaw.trim() !== ""
        ? modelRaw.trim()
        : null;
    let title = typeof body.title === "string" ? body.title.trim() || null : null;
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

    const clubExtras = parseClubSpecsFromBody(body as Record<string, unknown>);

    if (!category || !ALLOWED_CATEGORIES_SET.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!condition || !ALLOWED_CONDITIONS_SET.has(condition)) {
      return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    const hosel_serial_status = parseHoselSerialStatus(body.hosel_serial_status);
    const imageCountError = validateListingImageCount({
      category,
      imageCount,
      listingFormat: clubExtras.listing_format,
      wedgeLofts: (clubExtras.clubs ?? [])
        .map((c) => (typeof c.degree === "string" ? c.degree : ""))
        .filter(Boolean),
      hoselSerialStatus: hosel_serial_status,
    });
    if (imageCountError) {
      return NextResponse.json({ error: imageCountError }, { status: 400 });
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
      if (!brand || typeof brand !== "string" || !brand.trim()) {
        return NextResponse.json({ error: "Brand is required" }, { status: 400 });
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

    if (isGolfEquipmentCategory(category)) {
      const specError = validateNewGolfListingSpecs(category, {
        handed,
        degree,
        shaft_flex,
        club_length,
        listing_format: clubExtras.listing_format,
        iron_number: clubExtras.iron_number,
        set_composition: clubExtras.set_composition,
        head_number: clubExtras.head_number,
        standard_spec_status: clubExtras.standard_spec_status,
        clubs: clubExtras.clubs,
      });
      if (specError) {
        return NextResponse.json({ error: specError }, { status: 400 });
      }
    }

    title = deriveTitleIfMissing({
      title,
      category,
      brand,
      model,
      handed,
      degree,
      shaft_flex,
      shaft,
      listing_format: clubExtras.listing_format,
      iron_number: clubExtras.iron_number,
      set_composition: clubExtras.set_composition,
      head_number: clubExtras.head_number,
      club_length,
      standard_spec_status: clubExtras.standard_spec_status,
      clubs: clubExtras.clubs,
    });

    const parcel_preset = categoryToParcelPreset(category);

    const admin = createAdminClient();

    const { data: listing, error: listError } = await admin
      .from("listings")
      .insert({
        user_id: user.id,
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
        status: "pending",
        listing_format: clubExtras.listing_format,
        standard_spec_status: clubExtras.standard_spec_status,
        customised_aspects: clubExtras.customised_aspects,
        customised_other_note: clubExtras.customised_other_note,
        iron_number: clubExtras.iron_number,
        set_composition: clubExtras.set_composition,
        bounce: clubExtras.bounce,
        grind: clubExtras.grind,
        head_number: clubExtras.head_number,
        headcover_included: clubExtras.headcover_included,
        spec_provenance: clubExtras.spec_provenance,
        hosel_serial_status,
      })
      .select("id")
      .single();

    if (listError || !listing) {
      return NextResponse.json({ error: listError?.message ?? "Failed to create listing" }, { status: 500 });
    }

    if (clubExtras.clubs && clubExtras.clubs.length > 0) {
      const { error: clubsError } = await replaceListingClubs(admin, listing.id, clubExtras.clubs);
      if (clubsError) {
        return NextResponse.json({ error: clubsError }, { status: 500 });
      }
    }

    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      await admin.from("users").update({ role: "seller", updated_at: new Date().toISOString() }).eq("id", user.id);
    }

    const displayTitle =
      (title && title.trim()) || [brand, model].filter(Boolean).join(" ").trim() || "a new listing";
    await notifyListingReviewRequired(admin, {
      listingId: listing.id,
      title: displayTitle,
    });

    const envEmails = getAdminAlertEmails();
    const { data: adminUsers } = await admin.from("users").select("email").eq("role", "admin");
    const dbEmails = (adminUsers ?? [])
      .map((u) => (typeof u.email === "string" ? u.email.trim() : ""))
      .filter(Boolean);
    const adminTo = Array.from(new Set([...envEmails, ...dbEmails]));
    if (adminTo.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const subtitle = [brand, title || model, category].filter(Boolean).join(" · ");
      try {
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.NEW_LISTING_PENDING,
          referenceId: listing.id,
          referenceType: "listing",
          to: adminTo,
          subject: "\uD83D\uDC40 New listing ready to verify",
          type: "alert",
          variables: {
            title: "New listing ready to verify",
            subtitle: subtitle || "New listing",
            body: "A new listing is pending verification.",
            cta_link: appUrl ? `${appUrl}${adminListingUrl(listing.id)}` : "#",
            cta_text: "Review listing",
          },
        });
      } catch (e) {
        console.error("Failed to send new-listing admin email:", e);
      }
    }

    revalidateTag("public-listings");
    revalidatePath("/");
    revalidatePath(`/listing/${listing.id}`);

    return NextResponse.json({ id: listing.id });
  } catch (e) {
    console.error("Listings POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
