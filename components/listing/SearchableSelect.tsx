"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export interface SearchableSelectHandle {
  focus: () => void;
}

interface SearchableSelectProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  required?: boolean;
  id?: string;
  /** When true, value can be any string; on blur/close without selecting, the typed query is used as value */
  allowCustom?: boolean;
}

export const SearchableSelect = forwardRef<SearchableSelectHandle, SearchableSelectProps>(function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  label,
  required = false,
  id: propId,
  allowCustom = false,
}, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef(query);
  const id = propId ?? `searchable-${label.replace(/\s/g, "-").toLowerCase()}`;

  useImperativeHandle(ref, () => ({
    focus() {
      setOpen(true);
      setQuery(value || "");
    },
  }), [value]);

  queryRef.current = query;

  const filtered =
    query.trim() === ""
      ? [...options]
      : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (open) setQuery(value || "");
    else if (!allowCustom) setQuery("");
  }, [open, allowCustom, value]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const outside = containerRef.current && !containerRef.current.contains(target);
      const clickedOption = (target as Element).getAttribute?.("role") === "option" || (target as Element).closest?.("[role=option]");
      if (outside) {
        const query = queryRef.current.trim();
        const valueWasSelectedFromList = value && options.includes(value);
        if (allowCustom && query && !clickedOption && !valueWasSelectedFromList) onChange(query);
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [allowCustom, onChange, value, options]);

  const displayValue = value || "";
  const showInput = open;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-mowing-green mb-1">
        {label}
        {required && " *"}
      </label>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        id={id}
        tabIndex={0}
        className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green flex items-center gap-2 cursor-text outline-none focus:ring-2 focus:ring-mowing-green/30 focus:ring-offset-0"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          const isFromInput = e.target === inputRef.current;
          if (!isFromInput && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {showInput ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && allowCustom && filtered.length === 0 && query.trim()) {
                e.preventDefault();
                onChange(query.trim());
                setOpen(false);
              }
            }}
            className="flex-1 min-w-0 bg-transparent border-none p-0 outline-none"
            placeholder={displayValue || placeholder}
            aria-autocomplete="list"
            aria-controls={`${id}-listbox`}
          />
        ) : (
          <span
            className={`flex-1 min-w-0 text-left block ${displayValue ? "" : "text-mowing-green/50"}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
          >
            {displayValue || placeholder}
          </span>
        )}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-mowing-green/60 pointer-events-none"
          aria-hidden
        />
      </div>
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-mowing-green/30 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            allowCustom && query.trim() ? (
              <li
                role="option"
                className="px-4 py-2 text-sm text-mowing-green/80 cursor-pointer hover:bg-mowing-green/5"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                }}
              >
                Use &ldquo;{query.trim()}&rdquo;
              </li>
            ) : (
              <li className="px-4 py-2 text-sm text-mowing-green/60">No match</li>
            )
          ) : (
            filtered.map((option) => (
              <li
                key={option}
                role="option"
                aria-selected={value === option}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  value === option ? "bg-mowing-green/10 text-mowing-green font-medium" : "text-mowing-green hover:bg-mowing-green/5"
                }`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
});
