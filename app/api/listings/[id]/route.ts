import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { categoryToParcelPreset } from "@/lib/shippo";
import type { ListingCategory, ListingCondition } from "@/types/database";
import { ALL_CATEGORIES, CONDITIONS } from "@/lib/listing-categories";
import { notifyWatchersUnavailable } from "@/lib/watchlist-emails";
import { notifyListingReviewRequired, resolveListingReviewRequired } from "@/lib/notification-events";
import { ensureEmailSent, EmailTriggerType } from "@/lib/email-triggers";
import { getAdminAlertEmails, clearSentEmail } from "@/lib/fulfilment-emails";

function adminListingUrl(id: string) {
  return `/admin/listings/${id}`;
}

const ALLOWED_CATEGORIES_SET = new Set<string>(ALL_CATEGORIES);
const ALLOWED_CONDITIONS_SET = new Set<string>(CONDITIONS);

/**
 * PATCH /api/listings/[id]
 * Seller can:
 * - Unpublish/reactivate: body { archive: true } or { archive: false } (any status).
 * - Edit own pending listing: title, category, brand, model, condition, description, price, shaft, degree, shaft_flex.
 * parcel_preset is derived from category when category is updated.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: listing, error: fetchError } = await admin
    .from("listings")
    .select("id, user_id, status, availability_confirmation_status, admin_feedback, title, brand, model, category")
    .eq("id", id)
    .single();

  if (fetchError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Unpublish (archive) or reactivate: allowed for any status
  if (typeof body.archive === "boolean") {
    const updates = {
      updated_at: new Date().toISOString(),
      archived_at: body.archive ? new Date().toISOString() : null,
    };
    const { error } = await admin
      .from("listings")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (body.archive === true) {
      await notifyWatchersUnavailable(admin, id, "archived").catch((e) =>
        console.error("notifyWatchersUnavailable failed", e)
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Edit fields: pending listings, or sold listings awaiting availability confirmation.
  const canEdit =
    listing.status === "pending" || listing.availability_confirmation_status === "required";
  if (!canEdit) {
    return NextResponse.json(
      { error: "Only pending listings can be edited" },
      { status: 400 }
    );
  }

  const category: ListingCategory | undefined =
    typeof body.category === "string" && ALLOWED_CATEGORIES_SET.has(body.category)
      ? (body.category as ListingCategory)
      : undefined;
  const brand = typeof body.brand === "string" && body.brand.trim() ? body.brand.trim() : undefined;
  const model = typeof body.model === "string" ? body.model.trim() || null : body.model === null ? null : undefined;
  const title = typeof body.title === "string" ? body.title.trim() || null : undefined;
  const condition: ListingCondition | undefined =
    typeof body.condition === "string" && ALLOWED_CONDITIONS_SET.has(body.condition)
      ? (body.condition as ListingCondition)
      : undefined;
  const description = typeof body.description === "string" ? body.description.trim() || null : undefined;
  const price = typeof body.price === "number" ? body.price : typeof body.price === "string" ? parseInt(String(body.price), 10) : undefined;
  const shaft = typeof body.shaft === "string" ? body.shaft.trim() || null : undefined;
  const degree = typeof body.degree === "string" ? body.degree.trim() || null : undefined;
  const shaft_flex = typeof body.shaft_flex === "string" ? body.shaft_flex.trim() || null : undefined;
  const lie_angle =
    typeof body.lie_angle === "string" ? body.lie_angle.trim() || null : body.lie_angle === null ? null : undefined;
  const club_length =
    typeof body.club_length === "string"
      ? body.club_length.trim() || null
      : body.club_length === null
        ? null
        : undefined;
  const shaft_weight =
    typeof body.shaft_weight === "string"
      ? body.shaft_weight.trim() || null
      : body.shaft_weight === null
        ? null
        : undefined;
  const shaft_material =
    typeof body.shaft_material === "string"
      ? body.shaft_material.trim() || null
      : body.shaft_material === null
        ? null
        : undefined;
  const grip_brand =
    typeof body.grip_brand === "string" ? body.grip_brand.trim() || null : body.grip_brand === null ? null : undefined;
  const grip_model =
    typeof body.grip_model === "string" ? body.grip_model.trim() || null : body.grip_model === null ? null : undefined;
  const grip_size =
    typeof body.grip_size === "string" ? body.grip_size.trim() || null : body.grip_size === null ? null : undefined;
  const grip_condition =
    typeof body.grip_condition === "string"
      ? body.grip_condition.trim() || null
      : body.grip_condition === null
        ? null
        : undefined;
  const item_type = typeof body.item_type === "string" ? body.item_type.trim() || null : body.item_type === null ? null : undefined;
  const size = typeof body.size === "string" ? body.size.trim() || null : body.size === null ? null : undefined;
  const colour = typeof body.colour === "string" ? body.colour.trim() || null : body.colour === null ? null : undefined;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (category !== undefined) {
    updates.category = category;
    updates.parcel_preset = categoryToParcelPreset(category);
  }
  if (brand !== undefined) updates.brand = brand;
  if (model !== undefined) updates.model = model;
  if (title !== undefined) updates.title = title;
  if (condition !== undefined) updates.condition = condition;
  if (description !== undefined) updates.description = description;
  if (typeof price === "number" && Number.isFinite(price) && price > 0) updates.price = price;
  if (shaft !== undefined) updates.shaft = shaft;
  if (degree !== undefined) updates.degree = degree;
  if (shaft_flex !== undefined) updates.shaft_flex = shaft_flex;
  if (lie_angle !== undefined) updates.lie_angle = lie_angle;
  if (club_length !== undefined) updates.club_length = club_length;
  if (shaft_weight !== undefined) updates.shaft_weight = shaft_weight;
  if (shaft_material !== undefined) updates.shaft_material = shaft_material;
  if (grip_brand !== undefined) updates.grip_brand = grip_brand;
  if (grip_model !== undefined) updates.grip_model = grip_model;
  if (grip_size !== undefined) updates.grip_size = grip_size;
  if (grip_condition !== undefined) updates.grip_condition = grip_condition;
  if (item_type !== undefined) updates.item_type = item_type;
  if (size !== undefined) updates.size = size;
  if (colour !== undefined) updates.colour = colour;
  // Track whether this is a resubmission after admin feedback before clearing it
  const isResubmission = Object.keys(updates).length > 1 && !!listing.admin_feedback;
  if (Object.keys(updates).length > 1) updates.admin_feedback = null;

  const { error } = await admin.from("listings").update(updates).eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isResubmission) {
    const displayTitle =
      (listing.title && listing.title.trim()) ||
      [listing.brand, listing.model].filter(Boolean).join(" ").trim() ||
      "a listing";

    // Resolve any existing unactioned admin notification so a fresh one can be created
    await resolveListingReviewRequired(admin, id);
    await notifyListingReviewRequired(admin, { listingId: id, title: displayTitle, isResubmission: true });

    const envEmails = getAdminAlertEmails();
    const { data: adminUsers } = await admin.from("users").select("email").eq("role", "admin");
    const dbEmails = (adminUsers ?? [])
      .map((u) => (typeof u.email === "string" ? u.email.trim() : ""))
      .filter(Boolean);
    const adminTo = Array.from(new Set([...envEmails, ...dbEmails]));
    if (adminTo.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const subtitle = [listing.brand, listing.title || listing.model, listing.category].filter(Boolean).join(" · ");
      try {
        await clearSentEmail(admin, EmailTriggerType.NEW_LISTING_PENDING, id);
        await ensureEmailSent(admin, {
          emailType: EmailTriggerType.NEW_LISTING_PENDING,
          referenceId: id,
          referenceType: "listing",
          to: adminTo,
          subject: "Teevo: listing resubmitted for review",
          type: "alert",
          variables: {
            title: "Listing resubmitted",
            subtitle: subtitle || "Listing",
            body: "A seller has resubmitted their listing after making requested changes.",
            cta_link: appUrl ? `${appUrl}${adminListingUrl(id)}` : "#",
            cta_text: "Review listing",
          },
        });
      } catch (e) {
        console.error("Failed to send resubmission admin email:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
