import { type Check, type CheckResult } from "vibe-check";

import type { ProjectGateSelection } from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";

export type ProjectGateEligibility =
  | Readonly<{ readonly eligible: true }>
  | Readonly<{
      readonly eligible: false;
      readonly reasonCode: "profile-excluded" | "tag-disabled";
    }>;

export function projectGateEligibility(
  entry: ProjectGateEntry,
  selection: ProjectGateSelection
): ProjectGateEligibility {
  if (!entry.profiles.includes(selection.profile)) {
    return Object.freeze({ eligible: false, reasonCode: "profile-excluded" });
  }
  const disabledTags = new Set(selection.disabledTags);
  if (entry.tags.some((tag) => disabledTags.has(tag))) {
    return Object.freeze({ eligible: false, reasonCode: "tag-disabled" });
  }
  return Object.freeze({ eligible: true });
}

/** Keeps excluded raw facts visible without admitting them to aggregation. */
export function projectGateCheckForSelection(
  entry: ProjectGateEntry,
  selection: ProjectGateSelection
): Check {
  const eligibility = projectGateEligibility(entry, selection);
  if (eligibility.eligible) return entry.check;
  return Object.freeze({
    ...entry.check,
    execution: (): CheckResult =>
      Object.freeze({ status: "not-applicable", reason: { code: eligibility.reasonCode } })
  });
}

/** Returns the same collection's eligible IDs for the bound Run aggregation. */
export function projectGateEligibleCheckIds(
  entries: readonly ProjectGateEntry[],
  selection: ProjectGateSelection
): readonly string[] {
  return Object.freeze(
    entries
      .filter((entry) => projectGateEligibility(entry, selection).eligible)
      .map(({ check }) => check.checkId)
  );
}
