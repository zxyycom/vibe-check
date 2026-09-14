import type { Check, CheckFlagCondition, CheckFlagEnablement } from "@zxyycom/vibe-check";

import {
  PROJECT_GATE_ALL_FLAG,
  PROJECT_GATE_REQUIRED_FLAG,
  projectGatePresetFlag
} from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";

const PROJECT_GATE_PRODUCT_RUNTIME_TEST_CHECK_ID = "tests-product-runtime";
const PROJECT_GATE_PRODUCT_RUNTIME_CHANGE_FLAG = "vibe-check:change:product-runtime";

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
    enabledByFlags:
      entry.check.checkId === PROJECT_GATE_PRODUCT_RUNTIME_TEST_CHECK_ID
        ? productRuntimeTestEnablement()
        : Object.freeze({
            flags: Object.freeze(flags),
            mode: "any" as const,
            propagateDependsOn: true
          })
  });
}

/** Keeps the incremental runtime lane explicit while focused and complete Gate selections remain force paths. */
function productRuntimeTestEnablement(): CheckFlagEnablement {
  const requiredAndChangedConditions: readonly [CheckFlagCondition, ...CheckFlagCondition[]] =
    Object.freeze([
      Object.freeze({ kind: "flag", flag: PROJECT_GATE_REQUIRED_FLAG }),
      Object.freeze({
        kind: "flag",
        flag: PROJECT_GATE_PRODUCT_RUNTIME_CHANGE_FLAG
      })
    ]);
  const requiredAndChanged: CheckFlagCondition = Object.freeze({
    kind: "all",
    conditions: requiredAndChangedConditions
  });
  const conditions: readonly [CheckFlagCondition, ...CheckFlagCondition[]] = Object.freeze([
    requiredAndChanged,
    Object.freeze({ kind: "flag", flag: projectGatePresetFlag("test") }),
    Object.freeze({ kind: "flag", flag: PROJECT_GATE_ALL_FLAG })
  ]);
  const when: CheckFlagCondition = Object.freeze({
    kind: "any",
    conditions
  });
  return Object.freeze({
    when,
    propagateDependsOn: true as const
  });
}
