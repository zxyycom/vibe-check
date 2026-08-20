import type { ProjectGateCheckDescriptor } from "./catalog.ts";
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
