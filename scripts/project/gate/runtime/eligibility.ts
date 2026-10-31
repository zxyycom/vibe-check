import { all, any, changeFlag, type Check, type CheckFlagCondition } from "@zxyycom/vibe-check";

import {
  PROJECT_GATE_ALL_FLAG,
  PROJECT_GATE_CHANGED_FLAG,
  PROJECT_GATE_FAST_FLAG,
  PROJECT_GATE_RELEASE_FLAG,
  projectGatePresetFlag,
  projectGateScopeFlag
} from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";
import { isProjectGateScope, PROJECT_GATE_UNCLASSIFIED_INPUT_REGION } from "./change-regions.ts";

/**
 * Adds the Gate-owned native flag condition without mutating the owning Check
 * object. A selected Gate Check may activate its `dependsOn` prerequisites;
 * the Product still excludes `observes` from that propagation.
 */
export function projectGateFlagControlledCheck(entry: ProjectGateEntry): Check {
  const conditions = projectGateEntryConditions(entry);
  return Object.freeze({
    ...entry.check,
    enabledByFlags: Object.freeze({ when: any(...conditions), propagateDependsOn: true as const })
  });
}

function projectGateEntryConditions(
  entry: ProjectGateEntry
): [CheckFlagCondition, ...CheckFlagCondition[]] {
  const presets = entry.presets.map(projectGatePresetFlag);
  if (entry.selectionPolicy === "release-only") return [PROJECT_GATE_RELEASE_FLAG, ...presets];
  if (entry.selectionPolicy === "explicit-only") {
    const first = presets[0];
    if (first === undefined)
      throw new TypeError(`Project Gate explicit entry has no preset: ${entry.check.checkId}`);
    return [first, ...presets.slice(1)];
  }
  const affected = entry.changeRegion === undefined ? undefined : changeFlag(entry.changeRegion);
  const changedCondition =
    affected === undefined
      ? PROJECT_GATE_CHANGED_FLAG
      : all(
          PROJECT_GATE_CHANGED_FLAG,
          any(affected, changeFlag(PROJECT_GATE_UNCLASSIFIED_INPUT_REGION))
        );
  const conditions: [CheckFlagCondition, ...CheckFlagCondition[]] = [
    PROJECT_GATE_ALL_FLAG,
    changedCondition,
    ...presets
  ];
  if (isProjectGateScope(entry.changeRegion)) {
    conditions.push(projectGateScopeFlag(entry.changeRegion));
  }
  conditions.push(...(entry.scopes ?? []).map(projectGateScopeFlag));
  if (entry.fast !== false) {
    conditions.push(projectGateFastCondition(entry, affected));
  }
  return conditions;
}

/** Fixed base checks and affected engineering checks have distinct fast obligations. */
function projectGateFastCondition(
  entry: ProjectGateEntry,
  affected: CheckFlagCondition | undefined
): CheckFlagCondition {
  if (entry.fast === "always" || affected === undefined) return PROJECT_GATE_FAST_FLAG;
  return all(PROJECT_GATE_FAST_FLAG, affected);
}
