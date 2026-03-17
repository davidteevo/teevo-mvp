import { Suspense } from "react";
import { getClubCatalogue } from "@/lib/club-catalogue";
import { getClothingBrands } from "@/lib/clothing-brands";
import { CreateListingContent } from "./CreateListingContent";

export const dynamic = "force-dynamic";

export default async function AdminCreateListingPage() {
  const clubCatalogue = getClubCatalogue();
  const clothingBrands = getClothingBrands();
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">
          Loading…
        </div>
      }
    >
      <CreateListingContent clubCatalogue={clubCatalogue} clothingBrands={clothingBrands} />
    </Suspense>
  );
}
