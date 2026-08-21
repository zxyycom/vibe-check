import type { ProjectGateCheckDescriptor } from "./catalog.ts";
import { PROJECT_GATE_CATALOG } from "./catalog.ts";
import type { ProjectGateSelection } from "./controls.ts";

export type ProjectGateEligibility =
  | Readonly<{ readonly eligible: true }>
  | Readonly<{
      readonly eligible: false;
      readonly reasonCode: "profile-excluded" | "tag-disabled";
    }>;

export function projectGateEligibility(
  descriptor: ProjectGateCheckDescriptor,
  selection: ProjectGateSelection
): ProjectGateEligibility {
  if (!descriptor.profiles.includes(selection.profile)) {
    return Object.freeze({ eligible: false, reasonCode: "profile-excluded" });
  }
  const disabledTags = new Set(selection.disabledTags);
  if (descriptor.tags.some((tag) => disabledTags.has(tag))) {
    return Object.freeze({ eligible: false, reasonCode: "tag-disabled" });
  }
  return Object.freeze({ eligible: true });
}

/** Returns the canonical eligible IDs that the bound Run must aggregate. */
export function projectGateEligibleCheckIds(selection: ProjectGateSelection): readonly string[] {
  return Object.freeze(
    PROJECT_GATE_CATALOG.filter(
      (descriptor) => projectGateEligibility(descriptor, selection).eligible
    ).map(({ checkId }) => checkId)
  );
}
