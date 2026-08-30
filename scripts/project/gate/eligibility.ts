import { type Check, type CheckResult } from "vibe-check";

import {
  PROJECT_GATE_OPT_IN_TAGS,
  type ProjectGateOptInTag,
  type ProjectGateTag
} from "./catalog.ts";
import type { ProjectGateSelection } from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";

export type ProjectGateEligibility =
  | Readonly<{ readonly eligible: true }>
  | Readonly<{
      readonly eligible: false;
      readonly exclusion:
        | Readonly<{
            readonly kind: "profile-excluded";
            readonly profile: ProjectGateSelection["profile"];
          }>
        | Readonly<{ readonly kind: "tag-disabled"; readonly tag: ProjectGateTag }>
        | Readonly<{ readonly kind: "tag-not-enabled"; readonly tag: ProjectGateOptInTag }>;
    }>;

type ProjectGateExclusion = Extract<
  ProjectGateEligibility,
  { readonly eligible: false }
>["exclusion"];

type ProjectGateExclusionReasonCode =
  | `profile-${ProjectGateSelection["profile"]}-excluded`
  | `tag-${ProjectGateTag}-disabled`
  | `tag-${ProjectGateOptInTag}-not-enabled`;

export function projectGateEligibility(
  entry: ProjectGateEntry,
  selection: ProjectGateSelection
): ProjectGateEligibility {
  if (!entry.profiles.includes(selection.profile)) {
    return Object.freeze({
      eligible: false,
      exclusion: Object.freeze({ kind: "profile-excluded", profile: selection.profile })
    });
  }
  const disabledTags = new Set(selection.disabledTags);
  const disabledTag = entry.tags.find((tag) => disabledTags.has(tag));
  if (disabledTag !== undefined) {
    return Object.freeze({
      eligible: false,
      exclusion: Object.freeze({ kind: "tag-disabled", tag: disabledTag })
    });
  }
  const notEnabledTag = PROJECT_GATE_OPT_IN_TAGS.find(
    (tag) =>
      selection.profile !== "full" &&
      entry.tags.includes(tag) &&
      !selection.enabledTags.includes(tag)
  );
  if (notEnabledTag !== undefined) {
    return Object.freeze({
      eligible: false,
      exclusion: Object.freeze({ kind: "tag-not-enabled", tag: notEnabledTag })
    });
  }
  return Object.freeze({ eligible: true });
}

/** Keeps excluded Checks visible as their own terminal facts. */
export function projectGateCheckForSelection(
  entry: ProjectGateEntry,
  selection: ProjectGateSelection
): Check {
  const eligibility = projectGateEligibility(entry, selection);
  if (eligibility.eligible) return entry.check;
  return Object.freeze({
    ...entry.check,
    execution: (): CheckResult =>
      Object.freeze({
        status: "not-applicable",
        reason: { code: exclusionReasonCode(eligibility.exclusion) },
        messages: Object.freeze([
          Object.freeze({
            level: "info",
            code: "project-gate-check-not-run",
            message: exclusionMessage(entry, eligibility.exclusion)
          })
        ])
      })
  });
}

function exclusionReasonCode(exclusion: ProjectGateExclusion): ProjectGateExclusionReasonCode {
  switch (exclusion.kind) {
    case "profile-excluded":
      return `profile-${exclusion.profile}-excluded`;
    case "tag-disabled":
      return `tag-${exclusion.tag}-disabled`;
    case "tag-not-enabled":
      return `tag-${exclusion.tag}-not-enabled`;
  }
}

function exclusionMessage(entry: ProjectGateEntry, exclusion: ProjectGateExclusion): string {
  switch (exclusion.kind) {
    case "profile-excluded":
      return `${entry.check.displayName} did not run because profile ${exclusion.profile} does not include it.`;
    case "tag-disabled":
      return `${entry.check.displayName} did not run because tag ${exclusion.tag} was disabled.`;
    case "tag-not-enabled":
      return `${entry.check.displayName} did not run; use --enable-tag ${exclusion.tag} or --profile full.`;
  }
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
