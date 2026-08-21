"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { SearchableSelect } from "@/components/listing/SearchableSelect";
import { FilterChip } from "@/components/listing/FilterChip";
import { ChipGroup } from "./ChipGroup";
import { RadioCards } from "./RadioCards";
import { AdvancedDetailsFields } from "./AdvancedDetailsFields";
import {
  CUSTOMISED_ASPECT_OPTIONS,
  DRIVER_LOFT_OPTIONS,
  IRON_NUMBER_OPTIONS,
  IRON_SET_PRESETS,
  PUTTER_LENGTH_OPTIONS,
  SHAFT_FLEX_OPTIONS,
  WEDGE_LOFT_OPTIONS,
  WEDGE_SET_MAX,
  getClubLoftOptions,
  type ClubSpecsFormState,
  validateClubDetails,
} from "@/lib/club-specs/schemas";
import { newWedgeClubDraft } from "@/lib/club-specs/payload";
import type { StandardSpecStatus } from "@/types/database";
import { track } from "@/lib/analytics";

type ClubDetailsStepProps = {
  category: string;
  state: ClubSpecsFormState;
  onChange: (next: ClubSpecsFormState) => void;
  shaftOptions: string[];
  shaftLoading: boolean;
  gripCatalogue: { brands: string[]; modelsByBrand: Record<string, string[]> } | null;
  gripLoading: boolean;
  errorField?: string | null;
  errorMessage?: string | null;
};

function fieldError(field: string, errorField?: string | null, errorMessage?: string | null) {
  return errorField === field ? errorMessage ?? null : null;
}

export function ClubDetailsStep({
  category,
  state,
  onChange,
  shaftOptions,
  shaftLoading,
  gripCatalogue,
  gripLoading,
  errorField,
  errorMessage,
}: ClubDetailsStepProps) {
  const startedRef = useRef(false);
  const patch = (partial: Partial<ClubSpecsFormState>) => onChange({ ...state, ...partial });

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      track("club_details_started", { category });
    }
  }, [category]);

  const err = (field: string) => fieldError(field, errorField, errorMessage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-mowing-green">Club details</h2>
        <p className="text-sm text-mowing-green/70 mt-1">A few details help buyers find the right club.</p>
      </div>

      <ChipGroup
        label="Handedness"
        required
        options={[
          { value: "right", label: "Right handed" },
          { value: "left", label: "Left handed" },
        ]}
        value={state.handed}
        onChange={(v) => patch({ handed: v as "left" | "right" })}
        error={err("handed")}
      />

      {category === "Driver" ? (
        <DriverFields state={state} patch={patch} shaftOptions={shaftOptions} shaftLoading={shaftLoading} err={err} />
      ) : null}
      {category === "Woods" || category === "Hybrids" || category === "Driving Irons" ? (
        <WoodsHybridFields
          category={category}
          state={state}
          patch={patch}
          shaftOptions={shaftOptions}
          shaftLoading={shaftLoading}
          err={err}
        />
      ) : null}
      {category === "Irons" ? (
        <IronsFields state={state} patch={patch} shaftOptions={shaftOptions} shaftLoading={shaftLoading} err={err} />
      ) : null}
      {category === "Wedges" ? (
        <WedgeFields state={state} patch={patch} shaftOptions={shaftOptions} shaftLoading={shaftLoading} err={err} />
      ) : null}
      {category === "Putter" ? <PutterFields state={state} patch={patch} err={err} /> : null}

      <StandardSpecSection
        category={category}
        state={state}
        patch={patch}
        err={err}
        shaftOptions={shaftOptions}
        shaftLoading={shaftLoading}
        gripCatalogue={gripCatalogue}
        gripLoading={gripLoading}
      />
    </div>
  );
}

function ShaftModelField({
  state,
  patch,
  shaftOptions,
  shaftLoading,
  recommended,
}: {
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  shaftOptions: string[];
  shaftLoading: boolean;
  recommended?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-mowing-green mb-2">
        Shaft model{recommended ? <span className="font-normal text-mowing-green/60"> · recommended</span> : null}
      </p>
      <SearchableSelect
        options={shaftOptions}
        value={state.shaftUnknown ? "" : state.shaft}
        onChange={(v) => patch({ shaft: v, shaftUnknown: false })}
        placeholder={shaftLoading ? "Loading shafts…" : "Search shaft model..."}
        label="Shaft model"
        allowCustom
      />
      <div className="mt-2">
        <FilterChip
          selected={state.shaftUnknown}
          onClick={() => patch({ shaftUnknown: !state.shaftUnknown, shaft: "" })}
        >
          I don&apos;t know
        </FilterChip>
      </div>
    </div>
  );
}

function FlexField({
  state,
  patch,
  err,
  required,
}: {
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  err: (f: string) => string | null;
  required?: boolean;
}) {
  return (
    <div>
      <ChipGroup
        label="Shaft flex"
        required={required}
        options={SHAFT_FLEX_OPTIONS}
        value={state.shaftFlex}
        onChange={(v) => patch({ shaftFlex: v })}
        error={err("shaft_flex")}
      />
      {state.shaftFlex === "Other" ? (
        <input
          type="text"
          value={state.shaftFlexOther}
          onChange={(e) => patch({ shaftFlexOther: e.target.value })}
          placeholder="Enter flex"
          className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
        />
      ) : null}
    </div>
  );
}

function DriverFields({
  state,
  patch,
  shaftOptions,
  shaftLoading,
  err,
}: {
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  shaftOptions: string[];
  shaftLoading: boolean;
  err: (f: string) => string | null;
}) {
  return (
    <>
      <div>
        <ChipGroup
          label="Loft"
          required
          options={DRIVER_LOFT_OPTIONS}
          value={state.degree}
          onChange={(v) => patch({ degree: v })}
          error={err("degree")}
        />
        {state.degree === "Other" ? (
          <input
            type="text"
            inputMode="decimal"
            value={state.degreeOther}
            onChange={(e) => patch({ degreeOther: e.target.value })}
            placeholder="e.g. 8.5"
            className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
          />
        ) : null}
      </div>
      <FlexField state={state} patch={patch} err={err} required />
      <ShaftModelField
        state={state}
        patch={patch}
        shaftOptions={shaftOptions}
        shaftLoading={shaftLoading}
        recommended
      />
    </>
  );
}

function WoodsHybridFields({
  category,
  state,
  patch,
  shaftOptions,
  shaftLoading,
  err,
}: {
  category: string;
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  shaftOptions: string[];
  shaftLoading: boolean;
  err: (f: string) => string | null;
}) {
  const options = getClubLoftOptions(category);
  return (
    <>
      <div>
        <ChipGroup
          label="Club / loft"
          required
          options={options.map((o) => ({ value: o.value, label: o.label }))}
          value={state.clubLoftKey}
          onChange={(v) => {
            const opt = options.find((o) => o.value === v);
            patch({
              clubLoftKey: v,
              headNumber: opt?.headNumber ?? "",
              degree: opt && opt.value !== "Other" ? opt.degree : state.degree,
              degreeOther: opt?.value === "Other" ? state.degreeOther : "",
            });
          }}
          error={err("club_loft")}
        />
        {state.clubLoftKey === "Other" ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={state.headNumber}
              onChange={(e) => patch({ headNumber: e.target.value })}
              placeholder="e.g. 3"
              className="min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
            />
            <input
              type="text"
              inputMode="decimal"
              value={state.degreeOther || state.degree}
              onChange={(e) => patch({ degree: "Other", degreeOther: e.target.value })}
              placeholder="Loft °"
              className="min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
            />
          </div>
        ) : null}
      </div>
      <FlexField state={state} patch={patch} err={err} required />
      <ShaftModelField
        state={state}
        patch={patch}
        shaftOptions={shaftOptions}
        shaftLoading={shaftLoading}
        recommended
      />
    </>
  );
}

function IronsFields({
  state,
  patch,
  shaftOptions,
  shaftLoading,
  err,
}: {
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  shaftOptions: string[];
  shaftLoading: boolean;
  err: (f: string) => string | null;
}) {
  return (
    <>
      <RadioCards
        label="What are you selling?"
        required
        value={state.listingFormat}
        onChange={(v) =>
          patch({
            listingFormat: v,
            ironNumber: v === "set" ? "" : state.ironNumber,
            setComposition: v === "single" ? [] : state.setComposition,
          })
        }
        options={[
          { value: "single", title: "Individual iron", description: "One iron only." },
          { value: "set", title: "Iron set", description: "A matching set of irons." },
        ]}
        error={err("listing_format")}
      />
      {state.listingFormat === "single" ? (
        <ChipGroup
          label="Which iron?"
          required
          options={IRON_NUMBER_OPTIONS}
          value={state.ironNumber}
          onChange={(v) => patch({ ironNumber: v })}
          error={err("iron_number")}
        />
      ) : null}
      {state.listingFormat === "set" ? (
        <div>
          <ChipGroup
            label="What's included?"
            required
            options={IRON_SET_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            value={state.setCompositionPreset}
            onChange={(v) => {
              const preset = IRON_SET_PRESETS.find((p) => p.id === v);
              patch({
                setCompositionPreset: v,
                setComposition: preset && preset.id !== "custom" ? [...preset.clubs] : state.setComposition,
              });
            }}
            error={err("set_composition")}
          />
          {(state.setCompositionPreset === "custom" || state.setCompositionPreset === "") && (
            <div className="mt-3 flex flex-wrap gap-2">
              {IRON_NUMBER_OPTIONS.map((opt) => {
                const selected = state.setComposition.includes(opt.value);
                return (
                  <FilterChip
                    key={opt.value}
                    selected={selected}
                    onClick={() => {
                      const next = selected
                        ? state.setComposition.filter((c) => c !== opt.value)
                        : [...state.setComposition, opt.value];
                      patch({ setComposition: next, setCompositionPreset: "custom" });
                    }}
                  >
                    {opt.label}
                  </FilterChip>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      {state.listingFormat ? (
        <>
          <FlexField state={state} patch={patch} err={err} required />
          <ShaftModelField
            state={state}
            patch={patch}
            shaftOptions={shaftOptions}
            shaftLoading={shaftLoading}
            recommended
          />
        </>
      ) : null}
    </>
  );
}

function WedgeFields({
  state,
  patch,
  shaftOptions,
  shaftLoading,
  err,
}: {
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  shaftOptions: string[];
  shaftLoading: boolean;
  err: (f: string) => string | null;
}) {
  return (
    <>
      <RadioCards
        label="What are you selling?"
        required
        value={state.listingFormat}
        onChange={(v) => {
          track(v === "set" ? "wedge_set_selected" : "wedge_single_selected");
          patch({
            listingFormat: v,
            wedgeClubs:
              v === "set" && state.wedgeClubs.length === 0
                ? [newWedgeClubDraft(), newWedgeClubDraft(), newWedgeClubDraft()]
                : state.wedgeClubs,
          });
        }}
        options={[
          { value: "single", title: "One wedge", description: "A single wedge." },
          { value: "set", title: "A set of wedges", description: "Multiple wedges as one listing." },
        ]}
        error={err("listing_format")}
      />
      {state.listingFormat === "single" ? (
        <>
          <div>
            <ChipGroup
              label="Loft"
              required
              options={WEDGE_LOFT_OPTIONS}
              value={state.degree}
              onChange={(v) => patch({ degree: v })}
              error={err("degree")}
            />
            {state.degree === "Other" ? (
              <input
                type="text"
                inputMode="decimal"
                value={state.degreeOther}
                onChange={(e) => patch({ degreeOther: e.target.value })}
                placeholder="e.g. 62"
                className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
              />
            ) : null}
          </div>
          <div>
            <p className="text-sm font-medium text-mowing-green mb-2">
              Bounce<span className="font-normal text-mowing-green/60"> · recommended</span>
            </p>
            <input
              type="text"
              inputMode="decimal"
              value={state.bounceUnknown ? "" : state.bounce}
              onChange={(e) => patch({ bounce: e.target.value, bounceUnknown: false })}
              placeholder="Select bounce"
              disabled={state.bounceUnknown}
              className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green disabled:opacity-50"
            />
            <div className="mt-2">
              <FilterChip
                selected={state.bounceUnknown}
                onClick={() => patch({ bounceUnknown: !state.bounceUnknown, bounce: "" })}
              >
                I don&apos;t know
              </FilterChip>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-mowing-green mb-2">
              Grind<span className="font-normal text-mowing-green/60"> · recommended</span>
            </p>
            <input
              type="text"
              value={state.grindUnknown ? "" : state.grind}
              onChange={(e) => patch({ grind: e.target.value, grindUnknown: false })}
              placeholder="Select grind"
              disabled={state.grindUnknown}
              className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green disabled:opacity-50"
            />
            <div className="mt-2">
              <FilterChip
                selected={state.grindUnknown}
                onClick={() => patch({ grindUnknown: !state.grindUnknown, grind: "" })}
              >
                I don&apos;t know
              </FilterChip>
            </div>
          </div>
          <FlexField state={state} patch={patch} err={err} />
          <ShaftModelField
            state={state}
            patch={patch}
            shaftOptions={shaftOptions}
            shaftLoading={shaftLoading}
            recommended
          />
        </>
      ) : null}
      {state.listingFormat === "set" ? (
        <WedgeSetEditor state={state} patch={patch} err={err} />
      ) : null}
    </>
  );
}

function WedgeSetEditor({
  state,
  patch,
  err,
}: {
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  err: (f: string) => string | null;
}) {
  const editingClientId = state.editingWedgeId;

  return (
    <div>
      <p className="text-sm font-medium text-mowing-green mb-2">Your wedge set</p>
      {err("wedge_clubs") ? <p className="text-sm text-red-600 mb-2">{err("wedge_clubs")}</p> : null}
      <div className="space-y-3">
        {state.wedgeClubs.map((w, index) => {
          const isEditing = editingClientId === w.clientId || !w.degree.trim();
          const loftLabel = w.degree
            ? `${w.degree.includes("°") ? w.degree : `${w.degree}°`} Wedge`
            : `Wedge ${index + 1}`;
          const meta = [
            w.bounce && w.bounce !== "unknown"
              ? `${w.bounce}${w.bounce.includes("°") ? "" : "°"} bounce`
              : null,
            w.grind && w.grind !== "unknown" ? w.grind : null,
          ]
            .filter(Boolean)
            .join(" · ");

          const loftChipValue = WEDGE_LOFT_OPTIONS.some((o) => o.value === w.degree)
            ? w.degree
            : w.degree
              ? "Other"
              : "";

          if (!isEditing) {
            return (
              <div
                key={w.clientId}
                className="flex items-center justify-between gap-3 rounded-xl border border-mowing-green/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-mowing-green">{loftLabel}</p>
                  {meta ? <p className="text-sm text-mowing-green/65">{meta}</p> : null}
                  {err(`wedge_${index}`) ? (
                    <p className="text-sm text-red-600 mt-1">{err(`wedge_${index}`)}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-[44px] px-3 text-sm text-par-3-punch inline-flex items-center gap-1"
                    onClick={() => patch({ editingWedgeId: w.clientId })}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    type="button"
                    className="min-h-[44px] px-2 text-mowing-green/50"
                    aria-label="Remove wedge"
                    onClick={() =>
                      patch({ wedgeClubs: state.wedgeClubs.filter((c) => c.clientId !== w.clientId) })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={w.clientId}
              className="rounded-xl border border-mowing-green/30 p-4 space-y-4 bg-white"
            >
              <p className="text-sm font-semibold text-mowing-green">Wedge {index + 1}</p>
              {err(`wedge_${index}`) ? (
                <p className="text-sm text-red-600">{err(`wedge_${index}`)}</p>
              ) : null}
              <ChipGroup
                label="Loft"
                required
                options={WEDGE_LOFT_OPTIONS}
                value={loftChipValue}
                onChange={(v) => {
                  if (v !== "Other") {
                    const dup = state.wedgeClubs.some(
                      (c) => c.clientId !== w.clientId && c.degree === v
                    );
                    if (
                      dup &&
                      !window.confirm(
                        `You've already added a ${v}° wedge. Are you sure you want another?`
                      )
                    ) {
                      return;
                    }
                    patch({
                      wedgeClubs: state.wedgeClubs.map((c) =>
                        c.clientId === w.clientId ? { ...c, degree: v } : c
                      ),
                    });
                  } else {
                    patch({
                      wedgeClubs: state.wedgeClubs.map((c) =>
                        c.clientId === w.clientId ? { ...c, degree: "" } : c
                      ),
                    });
                  }
                }}
              />
              {loftChipValue === "Other" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={w.degree}
                  onChange={(e) =>
                    patch({
                      wedgeClubs: state.wedgeClubs.map((c) =>
                        c.clientId === w.clientId ? { ...c, degree: e.target.value } : c
                      ),
                    })
                  }
                  placeholder="Loft °"
                  className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2"
                />
              ) : null}
              <div>
                <p className="text-sm font-medium text-mowing-green mb-1">Bounce</p>
                <input
                  type="text"
                  value={w.bounce === "unknown" ? "" : w.bounce}
                  disabled={w.bounce === "unknown"}
                  onChange={(e) =>
                    patch({
                      wedgeClubs: state.wedgeClubs.map((c) =>
                        c.clientId === w.clientId ? { ...c, bounce: e.target.value } : c
                      ),
                    })
                  }
                  placeholder="e.g. 8"
                  className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 disabled:opacity-50"
                />
                <div className="mt-2">
                  <FilterChip
                    selected={w.bounce === "unknown"}
                    onClick={() =>
                      patch({
                        wedgeClubs: state.wedgeClubs.map((c) =>
                          c.clientId === w.clientId
                            ? { ...c, bounce: c.bounce === "unknown" ? "" : "unknown" }
                            : c
                        ),
                      })
                    }
                  >
                    I don&apos;t know
                  </FilterChip>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-mowing-green mb-1">Grind</p>
                <input
                  type="text"
                  value={w.grind === "unknown" ? "" : w.grind}
                  disabled={w.grind === "unknown"}
                  onChange={(e) =>
                    patch({
                      wedgeClubs: state.wedgeClubs.map((c) =>
                        c.clientId === w.clientId ? { ...c, grind: e.target.value } : c
                      ),
                    })
                  }
                  placeholder="e.g. F Grind"
                  className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 disabled:opacity-50"
                />
                <div className="mt-2">
                  <FilterChip
                    selected={w.grind === "unknown"}
                    onClick={() =>
                      patch({
                        wedgeClubs: state.wedgeClubs.map((c) =>
                          c.clientId === w.clientId
                            ? { ...c, grind: c.grind === "unknown" ? "" : "unknown" }
                            : c
                        ),
                      })
                    }
                  >
                    I don&apos;t know
                  </FilterChip>
                </div>
              </div>
              <button
                type="button"
                className="min-h-[44px] w-full rounded-lg bg-mowing-green text-white text-sm font-medium"
                onClick={() => {
                  if (!w.degree.trim()) {
                    alert(`Add the loft for Wedge ${index + 1}.`);
                    return;
                  }
                  patch({ editingWedgeId: null });
                }}
              >
                Save wedge
              </button>
            </div>
          );
        })}
      </div>
      {state.wedgeClubs.length < WEDGE_SET_MAX ? (
        <button
          type="button"
          className="mt-3 min-h-[44px] inline-flex items-center gap-1 text-sm font-medium text-par-3-punch"
          onClick={() => {
            track("wedge_added_to_set");
            const draft = newWedgeClubDraft();
            patch({
              wedgeClubs: [...state.wedgeClubs, draft],
              editingWedgeId: draft.clientId,
            });
          }}
        >
          <Plus className="h-4 w-4" /> Add another wedge
        </button>
      ) : null}
    </div>
  );
}

function PutterFields({
  state,
  patch,
  err,
}: {
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  err: (f: string) => string | null;
}) {
  return (
    <div>
      <ChipGroup
        label="Length"
        required
        options={PUTTER_LENGTH_OPTIONS}
        value={state.clubLength}
        onChange={(v) => patch({ clubLength: v })}
        error={err("club_length")}
      />
      {state.clubLength === "Other" ? (
        <input
          type="text"
          value={state.clubLengthOther}
          onChange={(e) => patch({ clubLengthOther: e.target.value })}
          placeholder='e.g. 32.5"'
          className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
        />
      ) : null}
    </div>
  );
}

function StandardSpecSection({
  category,
  state,
  patch,
  err,
  shaftOptions,
  shaftLoading,
  gripCatalogue,
  gripLoading,
}: {
  category: string;
  state: ClubSpecsFormState;
  patch: (p: Partial<ClubSpecsFormState>) => void;
  err: (f: string) => string | null;
  shaftOptions: string[];
  shaftLoading: boolean;
  gripCatalogue: { brands: string[]; modelsByBrand: Record<string, string[]> } | null;
  gripLoading: boolean;
}) {
  return (
    <div className="space-y-4 pt-2 border-t border-mowing-green/15">
      <RadioCards<StandardSpecStatus>
        label="Is this club standard spec?"
        required
        value={state.standardSpecStatus}
        onChange={(v) => {
          if (v === "standard") track("standard_spec_selected");
          if (v === "customised") track("customised_spec_selected");
          if (v === "unknown") track("unknown_spec_selected");
          patch({
            standardSpecStatus: v,
            customisedAspects: v === "customised" ? state.customisedAspects : [],
            customisedOtherNote: v === "customised" ? state.customisedOtherNote : "",
          });
        }}
        options={[
          {
            value: "standard",
            title: "Yes, standard spec",
            description: "I haven't changed anything.",
          },
          {
            value: "customised",
            title: "No, customised",
            description: "Something has been changed.",
          },
          {
            value: "unknown",
            title: "I'm not sure",
            description: "Not sure if anything has been changed.",
          },
        ]}
        error={err("standard_spec_status")}
      />

      {state.standardSpecStatus === "standard" ? (
        <p className="text-sm text-mowing-green/80 rounded-xl bg-mowing-green/5 px-4 py-3">
          <span className="font-semibold text-mowing-green">Great!</span> We&apos;ll use the standard
          specifications for this model where available.
        </p>
      ) : null}

      {state.standardSpecStatus === "unknown" ? (
        <p className="text-sm text-mowing-green/80 rounded-xl bg-mowing-green/5 px-4 py-3">
          <span className="font-semibold text-mowing-green">No problem.</span> You can still list your
          club and add more details if you know them.
        </p>
      ) : null}

      {state.standardSpecStatus === "customised" ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-mowing-green mb-1">What&apos;s different?</p>
            <p className="text-sm text-mowing-green/65 mb-2">Select anything that applies.</p>
            <div className="flex flex-wrap gap-2">
              {CUSTOMISED_ASPECT_OPTIONS.map((opt) => {
                const selected = state.customisedAspects.includes(opt.value);
                return (
                  <FilterChip
                    key={opt.value}
                    selected={selected}
                    onClick={() => {
                      const next = selected
                        ? state.customisedAspects.filter((a) => a !== opt.value)
                        : [...state.customisedAspects, opt.value];
                      patch({ customisedAspects: next });
                    }}
                  >
                    {opt.label}
                  </FilterChip>
                );
              })}
            </div>
            {err("customised_aspects") ? (
              <p className="mt-1.5 text-sm text-red-600">{err("customised_aspects")}</p>
            ) : null}
          </div>
          {state.customisedAspects.includes("other") ? (
            <div>
              <label className="block text-sm font-medium text-mowing-green mb-1">Other details</label>
              <textarea
                value={state.customisedOtherNote}
                onChange={(e) => patch({ customisedOtherNote: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
                placeholder="Briefly explain what's different"
              />
              {err("customised_other_note") ? (
                <p className="mt-1.5 text-sm text-red-600">{err("customised_other_note")}</p>
              ) : null}
            </div>
          ) : null}
          {state.customisedAspects.length > 0 ? (
            <AdvancedDetailsFields
              category={category}
              state={state}
              patch={patch}
              shaftOptions={shaftOptions}
              shaftLoading={shaftLoading}
              gripCatalogue={gripCatalogue}
              gripLoading={gripLoading}
              aspectsOnly
            />
          ) : null}
        </div>
      ) : null}

      {(state.standardSpecStatus === "standard" ||
        state.standardSpecStatus === "unknown" ||
        state.standardSpecStatus === "customised") && (
        <div>
          <button
            type="button"
            className="min-h-[44px] inline-flex items-center gap-1 text-sm font-medium text-par-3-punch"
            onClick={() => {
              if (!state.advancedOpen) track("advanced_details_opened");
              patch({ advancedOpen: !state.advancedOpen });
            }}
          >
            {state.advancedOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Add more details (optional)
          </button>
          <p className="text-xs text-mowing-green/55 mt-1">
            Length, shaft weight, grip, lie angle &amp; more
          </p>
          {state.advancedOpen ? (
            <div className="mt-4">
              <AdvancedDetailsFields
                category={category}
                state={state}
                patch={patch}
                shaftOptions={shaftOptions}
                shaftLoading={shaftLoading}
                gripCatalogue={gripCatalogue}
                gripLoading={gripLoading}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Re-export for form validation without circular imports in ListingForm */
export { validateClubDetails };
