import type { Check } from "vibe-check";

import { isStringArray } from "../../foundation/type-guards.ts";
import {
  PROJECT_GATE_PROFILES,
  PROJECT_GATE_TAGS,
  type ProjectGateProfile,
  type ProjectGateTag
} from "./catalog.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;

/** Project-local selection metadata for one ordinary Check value. */
export interface ProjectGateEntry {
  readonly check: Check;
  readonly profiles: readonly ProjectGateProfile[];
  readonly tags: readonly ProjectGateTag[];
}

/** Freezes entries after validating their selection and static dependency closure. */
export function defineProjectGateEntries(
  entries: readonly ProjectGateEntry[]
): readonly ProjectGateEntry[] {
  const entriesByCheckId = new Map<string, ProjectGateEntry>();
  for (const entry of entries) {
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

  for (const entry of entries) {
    const dependencies = entry.check.dependsOn ?? [];
    if (!isStringArray(dependencies)) {
      throw new TypeError(
        `Project Gate dependency is not an exact collection: ${entry.check.checkId}`
      );
    }
    for (const dependency of dependencies) {
      const dependencyEntry = entriesByCheckId.get(dependency);
      if (dependency === entry.check.checkId)
        throw new TypeError(`Project Gate Check cannot depend on itself: ${entry.check.checkId}`);
      if (dependencyEntry === undefined)
        throw new TypeError(
          `Project Gate dependency is missing: ${entry.check.checkId} -> ${dependency}`
        );
      if (entry.profiles.some((profile) => !dependencyEntry.profiles.includes(profile)))
        throw new TypeError(
          `Project Gate dependency is not selection-closed: ${entry.check.checkId} -> ${dependency}`
        );
      if (dependencyEntry.tags.some((tag) => !entry.tags.includes(tag)))
        throw new TypeError(
          `Project Gate dependency is not selection-closed: ${entry.check.checkId} -> ${dependency}`
        );
    }
  }

  return Object.freeze([...entries]);
}
