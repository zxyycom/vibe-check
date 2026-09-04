import type { Check } from "@zxyycom/vibe-check";

import type { ProjectGateSelection } from "./controls.ts";
import {
  PROJECT_GATE_ALL_FLAG,
  PROJECT_GATE_REQUIRED_FLAG,
  projectGatePresetFlag
} from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";

/** Adds the Gate-owned native flag condition without mutating the owning Check object. */
export function projectGateFlagControlledCheck(entry: ProjectGateEntry): Check {
  const flags: [string, ...string[]] = [
    PROJECT_GATE_ALL_FLAG,
    ...(entry.required ? [PROJECT_GATE_REQUIRED_FLAG] : []),
    ...entry.presets.map(projectGatePresetFlag)
  ];
  return Object.freeze({
    ...entry.check,
    enabledByFlags: Object.freeze({ flags: Object.freeze(flags), mode: "any" as const })
  });
}

/** Returns the IDs selected by the same entry metadata projected into native flags. */
export function projectGateEligibleCheckIds(
  entries: readonly ProjectGateEntry[],
  selection: ProjectGateSelection
): readonly string[] {
  return Object.freeze(
    entries
      .filter((entry) => projectGateEntryIsSelected(entry, selection))
      .map(({ check }) => check.checkId)
  );
}

function projectGateEntryIsSelected(
  entry: ProjectGateEntry,
  selection: ProjectGateSelection
): boolean {
  switch (selection.kind) {
    case "all":
      return true;
    case "required":
      return entry.required;
    case "focused":
      return entry.presets.some((preset) => selection.presets.includes(preset));
  }
}
