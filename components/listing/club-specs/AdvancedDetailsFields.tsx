"use client";

import { SearchableSelect } from "@/components/listing/SearchableSelect";
import { FilterChip } from "@/components/listing/FilterChip";
import { ChipGroup } from "./ChipGroup";
import {
  GRIP_SIZE_OPTIONS,
  LIE_ANGLE_OPTIONS,
  PUTTER_LENGTH_OPTIONS,
  CLUB_LENGTH_ADJUST_OPTIONS,
  SHAFT_MATERIAL_OPTIONS,
  type ClubSpecsFormState,
} from "@/lib/club-specs/schemas";
import { getConditionsForCategory } from "@/lib/listing-categories";

type AdvancedDetailsProps = {
  category: string;
  state: ClubSpecsFormState;
  patch: (partial: Partial<ClubSpecsFormState>) => void;
  shaftOptions: string[];
  shaftLoading: boolean;
  gripCatalogue: { brands: string[]; modelsByBrand: Record<string, string[]> } | null;
  gripLoading: boolean;
  /** When customised, only show aspects that were selected (plus always length etc. if in aspects). */
  aspectsOnly?: boolean;
};

export function AdvancedDetailsFields({
  category,
  state,
  patch,
  shaftOptions,
  shaftLoading,
  gripCatalogue,
  gripLoading,
  aspectsOnly,
}: AdvancedDetailsProps) {
  const aspects = new Set(state.customisedAspects);
  const show = (key: "shaft" | "length" | "loft_lie" | "grip") =>
    !aspectsOnly || aspects.has(key);

  const isPutter = category === "Putter";
  const lengthOptions = isPutter ? PUTTER_LENGTH_OPTIONS : CLUB_LENGTH_ADJUST_OPTIONS;

  const gripConditions = getConditionsForCategory("Driver");

  return (
    <div className="space-y-5">
      {show("shaft") && !isPutter ? (
        <>
          <div>
            <p className="text-sm font-medium text-mowing-green mb-2">Shaft model</p>
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
          <div>
            <label className="block text-sm font-medium text-mowing-green mb-1">Shaft weight</label>
            <input
              type="text"
              value={state.shaftWeight}
              onChange={(e) => patch({ shaftWeight: e.target.value })}
              placeholder="e.g. 60g"
              className="w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
            />
          </div>
          <ChipGroup
            label="Shaft material"
            options={SHAFT_MATERIAL_OPTIONS}
            value={state.shaftMaterial}
            onChange={(v) => patch({ shaftMaterial: v })}
          />
        </>
      ) : null}

      {show("length") && !isPutter ? (
        <div>
          <ChipGroup
            label={isPutter ? "Length" : "Length vs standard"}
            options={lengthOptions}
            value={state.clubLength}
            onChange={(v) => patch({ clubLength: v, clubLengthOther: v === "Other" ? state.clubLengthOther : "" })}
          />
          {state.clubLength === "Other" ? (
            <input
              type="text"
              value={state.clubLengthOther}
              onChange={(e) => patch({ clubLengthOther: e.target.value })}
              placeholder={isPutter ? 'e.g. 32.5"' : 'e.g. +0.25"'}
              className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
            />
          ) : null}
        </div>
      ) : null}

      {show("loft_lie") && !isPutter ? (
        <div>
          <ChipGroup
            label="Lie angle"
            options={LIE_ANGLE_OPTIONS}
            value={state.lieAngle}
            onChange={(v) => patch({ lieAngle: v })}
          />
          {state.lieAngle === "Other" ? (
            <input
              type="text"
              value={state.lieAngleOther}
              onChange={(e) => patch({ lieAngleOther: e.target.value })}
              placeholder="e.g. 62°"
              className="mt-2 w-full min-h-[44px] rounded-lg border border-mowing-green/30 px-3 py-2 text-mowing-green"
            />
          ) : null}
        </div>
      ) : null}

      {show("grip") ? (
        <>
          <div>
            <p className="text-sm font-medium text-mowing-green mb-2">Grip brand</p>
            <SearchableSelect
              options={gripCatalogue?.brands ?? []}
              value={state.gripBrand}
              onChange={(v) => patch({ gripBrand: v, gripModel: "" })}
              placeholder={gripLoading ? "Loading grips…" : "Search grip brand..."}
              label="Grip brand"
              allowCustom
            />
          </div>
          <div>
            <p className="text-sm font-medium text-mowing-green mb-2">Grip model</p>
            <SearchableSelect
              options={
                state.gripBrand && gripCatalogue?.modelsByBrand?.[state.gripBrand]
                  ? gripCatalogue.modelsByBrand[state.gripBrand]
                  : []
              }
              value={state.gripModel}
              onChange={(v) => patch({ gripModel: v })}
              placeholder="Search grip model..."
              label="Grip model"
              allowCustom
            />
          </div>
          <ChipGroup
            label="Grip size"
            options={GRIP_SIZE_OPTIONS}
            value={state.gripSize}
            onChange={(v) => patch({ gripSize: v })}
          />
          <ChipGroup
            label="Grip condition"
            options={gripConditions.map((c) => ({ value: c, label: c }))}
            value={state.gripCondition}
            onChange={(v) => patch({ gripCondition: v })}
          />
        </>
      ) : null}
    </div>
  );
}
