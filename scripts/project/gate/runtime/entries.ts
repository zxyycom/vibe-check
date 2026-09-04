import type { Check } from "@zxyycom/vibe-check";

import { isStringArray } from "../../../value-guards.ts";
import { PROJECT_GATE_PRESETS, type ProjectGatePreset } from "./catalog.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;
const PROJECT_GATE_RELATIONS = ["dependsOn", "observes"] as const;

type ProjectGateRelation = (typeof PROJECT_GATE_RELATIONS)[number];

/** Project-local selection metadata for one ordinary Check value. */
export interface ProjectGateEntry {
  readonly check: Check;
  readonly presets: readonly ProjectGatePreset[];
  readonly required: boolean;
}

/** Freezes entries after validating their preset and static relation closure. */
export function defineProjectGateEntries(
  entries: readonly ProjectGateEntry[]
): readonly ProjectGateEntry[] {
  const entriesByCheckId = new Map<string, ProjectGateEntry>();
  for (const entry of entries) validateProjectGateEntryMetadata(entry, entriesByCheckId);
  for (const entry of entries) validateProjectGateEntryRelations(entry, entriesByCheckId);
  return Object.freeze([...entries]);
}

function validateProjectGateEntryRelations(
  entry: ProjectGateEntry,
  entriesByCheckId: ReadonlyMap<string, ProjectGateEntry>
): void {
  for (const relation of PROJECT_GATE_RELATIONS) {
    const checkIds = entry.check[relation] ?? [];
    if (!isStringArray(checkIds)) {
      throw new TypeError(
        `Project Gate ${relation} relation is not an exact collection: ${entry.check.checkId}`
      );
    }
    for (const checkId of checkIds) {
      validateProjectGateRelation(entry, relation, checkId, entriesByCheckId);
    }
  }
}

function validateProjectGateRelation(
  entry: ProjectGateEntry,
  relation: ProjectGateRelation,
  checkId: string,
  entriesByCheckId: ReadonlyMap<string, ProjectGateEntry>
): void {
  if (checkId === entry.check.checkId) {
    const action = relation === "dependsOn" ? "depend on" : "observe";
    throw new TypeError(`Project Gate Check cannot ${action} itself: ${entry.check.checkId}`);
  }
  const relatedEntry = entriesByCheckId.get(checkId);
  if (relatedEntry === undefined) {
    throw new TypeError(
      `Project Gate ${relation} relation is missing: ${entry.check.checkId} -> ${checkId}`
    );
  }
  if (entry.required && !relatedEntry.required) {
    throw new TypeError(
      `Project Gate ${relation} relation is not required-selection closed: ${entry.check.checkId} -> ${checkId}`
    );
  }
  if (entry.presets.some((preset) => !relatedEntry.presets.includes(preset))) {
    throw new TypeError(
      `Project Gate ${relation} relation is not preset-selection closed: ${entry.check.checkId} -> ${checkId}`
    );
  }
}

function validateProjectGateEntryMetadata(
  entry: ProjectGateEntry,
  entriesByCheckId: Map<string, ProjectGateEntry>
): void {
  const { check, presets, required } = entry;
  if (!CHECK_ID_PATTERN.test(check.checkId))
    throw new TypeError(`Project Gate Check ID is invalid: ${check.checkId}`);
  if (entriesByCheckId.has(check.checkId))
    throw new TypeError(`Project Gate Check ID is duplicated: ${check.checkId}`);
  if (check.enabledByFlags !== undefined)
    throw new TypeError(`Project Gate Check already owns enabledByFlags: ${check.checkId}`);
  if (typeof required !== "boolean")
    throw new TypeError(`Project Gate entry required marker is invalid: ${check.checkId}`);
  if (!isStringArray(presets))
    throw new TypeError(`Project Gate entry presets are not an exact collection: ${check.checkId}`);
  if (presets.some((preset) => !PROJECT_GATE_PRESETS.includes(preset)))
    throw new TypeError(`Project Gate entry has an unknown preset: ${check.checkId}`);
  if (new Set(presets).size !== presets.length)
    throw new TypeError(`Project Gate entry has duplicated presets: ${check.checkId}`);
  entriesByCheckId.set(check.checkId, entry);
}
