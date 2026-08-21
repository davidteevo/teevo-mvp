"use client";

import clsx from "clsx";

type RadioCardOption<T extends string> = {
  value: T;
  title: string;
  description?: string;
};

type RadioCardsProps<T extends string> = {
  label: string;
  required?: boolean;
  options: RadioCardOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string | null;
};

export function RadioCards<T extends string>({
  label,
  required,
  options,
  value,
  onChange,
  error,
}: RadioCardsProps<T>) {
  return (
    <div>
      <p className="text-sm font-medium text-mowing-green mb-2">
        {label}
        {required ? <span className="text-par-3-punch"> *</span> : null}
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={clsx(
                "w-full min-h-[56px] text-left rounded-xl border px-4 py-3 transition-colors",
                selected
                  ? "border-mowing-green bg-mowing-green/5"
                  : "border-mowing-green/25 bg-white hover:border-mowing-green/50"
              )}
            >
              <span className="block text-sm font-semibold text-mowing-green">{opt.title}</span>
              {opt.description ? (
                <span className="block text-sm text-mowing-green/65 mt-0.5">{opt.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
