import type { Check } from "@zxyycom/vibe-check";

import { isStringArray } from "../../../value-guards.ts";
import {
  PROJECT_GATE_PROFILES,
  PROJECT_GATE_TAGS,
  type ProjectGateProfile,
  type ProjectGateTag
} from "./catalog.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;
const PROJECT_GATE_RELATIONS = ["dependsOn", "observes"] as const;

type ProjectGateRelation = (typeof PROJECT_GATE_RELATIONS)[number];

/** Project-local selection metadata for one ordinary Check value. */
export interface ProjectGateEntry {
  readonly check: Check;
  readonly profiles: readonly ProjectGateProfile[];
  readonly tags: readonly ProjectGateTag[];
}

/** Freezes entries after validating their selection and static relation closure. */
export function defineProjectGateEntries(
  entries: readonly ProjectGateEntry[]
): readonly ProjectGateEntry[] {
  const entriesByCheckId = new Map<string, ProjectGateEntry>();
  for (const entry of entries) {
    validateProjectGateEntryMetadata(entry, entriesByCheckId);
  }

  for (const entry of entries) {
    validateProjectGateEntryRelations(entry, entriesByCheckId);
  }

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
  if (relatedEntry === undefined)
    throw new TypeError(
      `Project Gate ${relation} relation is missing: ${entry.check.checkId} -> ${checkId}`
    );
  if (entry.profiles.some((profile) => !relatedEntry.profiles.includes(profile)))
    throw new TypeError(
      `Project Gate ${relation} relation is not selection-closed: ${entry.check.checkId} -> ${checkId}`
    );
  if (relatedEntry.tags.some((tag) => !entry.tags.includes(tag)))
    throw new TypeError(
      `Project Gate ${relation} relation is not selection-closed: ${entry.check.checkId} -> ${checkId}`
    );
}

function validateProjectGateEntryMetadata(
  entry: ProjectGateEntry,
  entriesByCheckId: Map<string, ProjectGateEntry>
): void {
  const { check, profiles, tags } = entry;
  if (!CHECK_ID_PATTERN.test(check.checkId))
    throw new TypeError(`Project Gate Check ID is invalid: ${check.checkId}`);
  if (entriesByCheckId.has(check.checkId))
    throw new TypeError(`Project Gate Check ID is duplicated: ${check.checkId}`);
  if (profiles.length === 0)
    throw new TypeError(`Project Gate entry has no profile: ${check.checkId}`);
  if (profiles.some((profile) => !PROJECT_GATE_PROFILES.includes(profile)))
    throw new TypeError(`Project Gate entry has an unknown profile: ${check.checkId}`);
  if (tags.some((tag) => !PROJECT_GATE_TAGS.includes(tag)))
    throw new TypeError(`Project Gate entry has an unknown tag: ${check.checkId}`);
  entriesByCheckId.set(check.checkId, entry);
}
