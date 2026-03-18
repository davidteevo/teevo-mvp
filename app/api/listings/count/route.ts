import { NextResponse } from "next/server";
import { getVerifiedListingsCount } from "@/lib/listings";
import { parseFiltersFromUrlSearchParams } from "@/lib/home-filter-url";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseFiltersFromUrlSearchParams(url.searchParams);
    const count = await getVerifiedListingsCount(filters);
    return NextResponse.json({ count });
  } catch (e) {
    console.error("[listings/count]", e);
    return NextResponse.json({ count: 0, error: "failed" }, { status: 500 });
  }
}
