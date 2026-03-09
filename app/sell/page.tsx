import { Suspense } from "react";
import { getClubCatalogue } from "@/lib/club-catalogue";
import { getClothingBrands } from "@/lib/clothing-brands";
import { SellPageContent } from "./SellPageContent";

export default async function SellPage() {
  const clubCatalogue = getClubCatalogue();
  const clothingBrands = getClothingBrands();
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-mowing-green/80">Loading…</div>
    }>
      <SellPageContent clubCatalogue={clubCatalogue} clothingBrands={clothingBrands} />
    </Suspense>
  );
}
