"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PLACEHOLDER = "Search drivers, Scotty Cameron, Qi10, wedges...";
const DEBOUNCE_MS = 250;

type Suggestion = { label: string; category: string; brand: string; model: string };

export function SmartSearchHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [refinementQuestion, setRefinementQuestion] = useState<string | null>(null);
  const [refinementContext, setRefinementContext] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyFilters = useCallback(
    (filters: Record<string, string>) => {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.brand) params.set("brand", filters.brand);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.search) params.set("search", filters.search);
      if (filters.shaft) params.set("shaft", filters.shaft);
      if (filters.shaftFlex) params.set("shaftFlex", filters.shaftFlex);
      if (filters.degree) params.set("degree", filters.degree);
      if (filters.handed) params.set("handed", filters.handed);
      router.push(`/?${params.toString()}`);
    },
    [router]
  );

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/listings/suggestions?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({ suggestions: [] }));
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setHighlightedIndex(-1);
      setSuggestionsOpen(true);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const selectSuggestion = useCallback(
    (s: Suggestion) => {
      setQuery("");
      setSuggestions([]);
      setSuggestionsOpen(false);
      setError(null);
      applyFilters({
        category: s.category,
        brand: s.brand,
        search: s.model,
      });
    },
    [applyFilters]
  );

  const sendToAi = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setError(null);
      setLoading(true);
      setRefinementQuestion(null);
      setSuggestionsOpen(false);
      try {
        const res = await fetch("/api/ai/search-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Something went wrong. Try the filters below.");
          return;
        }
        if (data.refinementQuestion) {
          setRefinementQuestion(data.refinementQuestion);
          setRefinementContext(q.trim());
        } else if (data.filters && typeof data.filters === "object") {
          const f = data.filters as Record<string, string>;
          if (Object.keys(f).length > 0) {
            applyFilters(f);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [applyFilters]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestionsOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      selectSuggestion(suggestions[highlightedIndex]);
      return;
    }
    if (suggestionsOpen && suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }
    sendToAi(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestionsOpen || suggestions.length === 0) {
      if (e.key === "Escape") setSuggestionsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setSuggestionsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefinementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = (e.currentTarget.querySelector('input[name="refinement"]') as HTMLInputElement)?.value?.trim();
    if (!answer) return;
    sendToAi(`${refinementContext} — ${answer}`);
    setRefinementQuestion(null);
    setRefinementContext("");
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="max-w-2xl relative" role="search">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative" ref={dropdownRef}>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              placeholder={PLACEHOLDER}
              disabled={loading}
              autoComplete="off"
              aria-label="Search listings"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls="search-suggestions"
              id="hero-search"
              className="w-full rounded-xl border border-mowing-green/30 bg-white px-4 py-3 text-mowing-green placeholder:text-mowing-green/50 focus:outline-none focus:ring-2 focus:ring-mowing-green/40"
            />
            {suggestionsOpen && suggestions.length > 0 && (
              <ul
                id="search-suggestions"
                role="listbox"
                className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-par-3-punch/20 bg-white shadow-lg py-1 max-h-60 overflow-auto"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.model}-${s.brand}-${s.category}-${i}`}
                    role="option"
                    aria-selected={i === highlightedIndex}
                    className={`px-4 py-2.5 cursor-pointer text-sm ${
                      i === highlightedIndex ? "bg-mowing-green/10 text-mowing-green" : "text-mowing-green"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    onClick={() => selectSuggestion(s)}
                  >
                    <span className="font-medium">{s.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-mowing-green text-off-white-pique px-6 py-3 font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>
      <p className="mt-3 text-center text-mowing-green/70 text-sm">
        or{" "}
        <Link
          href="/sell"
          className="font-medium text-mowing-green hover:underline"
        >
          Sell your gear
        </Link>
        {" — "}
        <Link
          href="/sell"
          className="inline-flex items-center rounded-lg bg-par-3-punch/20 text-mowing-green px-4 py-2 text-sm font-medium hover:bg-par-3-punch/30 transition-colors"
        >
          List an item
        </Link>
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-600/90" role="alert">
          {error}
        </p>
      )}
      {refinementQuestion && (
        <form onSubmit={handleRefinementSubmit} className="mt-4 p-4 rounded-xl bg-mowing-green/10 border border-mowing-green/20">
          <p className="text-sm font-medium text-mowing-green mb-2">{refinementQuestion}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              name="refinement"
              placeholder="e.g. Maximum forgiveness"
              className="flex-1 rounded-lg border border-mowing-green/30 bg-white px-3 py-2 text-sm text-mowing-green placeholder:text-mowing-green/50 focus:outline-none focus:ring-2 focus:ring-mowing-green/40"
            />
            <button
              type="submit"
              className="rounded-lg bg-mowing-green text-off-white-pique px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Apply
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
