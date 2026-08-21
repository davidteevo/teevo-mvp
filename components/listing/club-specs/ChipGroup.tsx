"use client";

import { FilterChip } from "@/components/listing/FilterChip";

type Option = { value: string; label: string };

type ChipGroupProps = {
  label: string;
  required?: boolean;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  className?: string;
};

export function ChipGroup({
  label,
  required,
  options,
  value,
  onChange,
  error,
  className,
}: ChipGroupProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-mowing-green mb-2">
        {label}
        {required ? <span className="text-par-3-punch"> *</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <FilterChip
            key={opt.value}
            selected={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
