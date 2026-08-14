import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FoundingSellerBadge } from "@/components/trust/FoundingSellerBadge";
import { FeedbackAuthGate } from "@/components/reviews/FeedbackAuthGate";
import { SellerReviewsList } from "@/components/reviews/SellerReviewsList";
import { StarRating } from "@/components/reviews/StarRating";
import {
  formatRatingAverage,
  getSellerPublicProfile,
  publicAvatarUrl,
} from "@/lib/seller-reviews";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const profile = await getSellerPublicProfile(admin, id);
  if (!profile) notFound();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = profile.display_name?.trim() || "Teevo seller";
  const averageDisplay = formatRatingAverage(profile.rating_average);
  const count = profile.rating_count ?? 0;
  const avatarUrl = publicAvatarUrl(profile.avatar_path);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="rounded-xl border border-par-3-punch/20 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden bg-mowing-green/10">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-mowing-green">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-mowing-green">{name}</h1>
            {profile.founding_seller_rank != null && (
              <div className="mt-1">
                <FoundingSellerBadge rank={profile.founding_seller_rank} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {count > 0 && averageDisplay ? (
            <>
              <StarRating value={Math.round(Number(averageDisplay))} readOnly size="sm" />
              <p className="text-lg font-semibold text-mowing-green">
                {averageDisplay} ★
              </p>
              <p className="text-mowing-green/70">
                {count} review{count === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <div>
              <p className="font-medium text-mowing-green">No feedback yet</p>
              <p className="text-sm text-mowing-green/70">New seller on Teevo</p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-mowing-green mb-4">Feedback</h2>
        {user ? (
          <SellerReviewsList sellerId={id} />
        ) : (
          <FeedbackAuthGate returnPath={`/seller/${id}`} />
        )}
      </section>
    </div>
  );
}
