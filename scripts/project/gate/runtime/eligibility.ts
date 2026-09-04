import type { Check } from "@zxyycom/vibe-check";

import {
  PROJECT_GATE_ALL_FLAG,
  PROJECT_GATE_REQUIRED_FLAG,
  projectGatePresetFlag
} from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";

/**
 * Adds the Gate-owned native flag condition without mutating the owning Check
 * object. A selected Gate Check may activate its `dependsOn` prerequisites;
 * the Product still excludes `observes` from that propagation.
 */
export function projectGateFlagControlledCheck(entry: ProjectGateEntry): Check {
  const flags: [string, ...string[]] = [
    PROJECT_GATE_ALL_FLAG,
    ...(entry.required ? [PROJECT_GATE_REQUIRED_FLAG] : []),
    ...entry.presets.map(projectGatePresetFlag)
  ];
  return Object.freeze({
    ...entry.check,
    enabledByFlags: Object.freeze({
      flags: Object.freeze(flags),
      mode: "any" as const,
      propagateDependsOn: true
    })
  });
}
