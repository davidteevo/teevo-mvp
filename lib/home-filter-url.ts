import type { Filters } from "@/lib/listings";

/** Serializable home browse filter state (query string). */
export type HomeFilterState = {
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  search: string;
  shaft: string;
  shaftFlex: string;
  degree: string;
  degreeMin: string;
  handed: string;
  item_type: string;
  size: string;
  condition: string;
  sort: string;
};

export const emptyHomeFilterState = (): HomeFilterState => ({
  category: "",
  brand: "",
  minPrice: "",
  maxPrice: "",
  search: "",
  shaft: "",
  shaftFlex: "",
  degree: "",
  degreeMin: "",
  handed: "",
  item_type: "",
  size: "",
  condition: "",
  sort: "newest",
});

export function searchParamsToHomeState(sp: URLSearchParams): HomeFilterState {
  return {
    category: sp.get("category") ?? "",
    brand: sp.get("brand") ?? "",
    minPrice: sp.get("minPrice") ?? "",
    maxPrice: sp.get("maxPrice") ?? "",
    search: sp.get("search") ?? "",
    shaft: sp.get("shaft") ?? "",
    shaftFlex: sp.get("shaftFlex") ?? "",
    degree: sp.get("degree") ?? "",
    degreeMin: sp.get("degreeMin") ?? "",
    handed: sp.get("handed") ?? "",
    item_type: sp.get("item_type") ?? "",
    size: sp.get("size") ?? "",
    condition: sp.get("condition") ?? "",
    sort: sp.get("sort") || "newest",
  };
}

export function homeStateToSearchParams(s: HomeFilterState): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: keyof HomeFilterState, key: string) => {
    const v = s[k]?.trim();
    if (v) p.set(key, v);
  };
  set("category", "category");
  set("brand", "brand");
  set("minPrice", "minPrice");
  set("maxPrice", "maxPrice");
  set("search", "search");
  set("shaft", "shaft");
  set("shaftFlex", "shaftFlex");
  if (s.degreeMin?.trim()) {
    p.set("degreeMin", s.degreeMin.trim());
  } else if (s.degree?.trim()) {
    p.set("degree", s.degree.trim());
  }
  set("handed", "handed");
  set("item_type", "item_type");
  set("size", "size");
  set("condition", "condition");
  if (s.sort && s.sort !== "newest") p.set("sort", s.sort);
  return p;
}

export function homeStateToFilters(s: HomeFilterState): Filters {
  const f: Filters = {};
  if (s.category) f.category = s.category;
  if (s.brand) f.brand = s.brand;
  if (s.minPrice) f.minPrice = s.minPrice;
  if (s.maxPrice) f.maxPrice = s.maxPrice;
  if (s.search) f.search = s.search;
  if (s.shaft) f.shaft = s.shaft;
  if (s.shaftFlex) f.shaftFlex = s.shaftFlex;
  if (s.degreeMin) f.degreeMin = s.degreeMin;
  else if (s.degree) f.degree = s.degree;
  if (s.handed) f.handed = s.handed;
  if (s.item_type) f.item_type = s.item_type;
  if (s.size) f.size = s.size;
  if (s.condition) f.condition = s.condition;
  if (s.sort && s.sort !== "newest") f.sort = s.sort;
  return f;
}

export function parseFiltersFromUrlSearchParams(sp: URLSearchParams): Filters {
  return homeStateToFilters(searchParamsToHomeState(sp));
}
