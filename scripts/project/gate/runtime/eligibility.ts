import { all, any, changeFlag, type Check, type CheckFlagEnablement } from "@zxyycom/vibe-check";

import {
  PROJECT_GATE_ALL_FLAG,
  PROJECT_GATE_REQUIRED_FLAG,
  projectGatePresetFlag
} from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";

const PROJECT_GATE_PRODUCT_RUNTIME_TEST_CHECK_ID = "tests-product-runtime";
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
            when: any(...flags),
            propagateDependsOn: true
          })
  });
}

/** Keeps the incremental runtime lane explicit while focused and complete Gate selections remain force paths. */
function productRuntimeTestEnablement(): CheckFlagEnablement {
  return Object.freeze({
    when: any(
      all(PROJECT_GATE_REQUIRED_FLAG, changeFlag("product-runtime")),
      projectGatePresetFlag("test"),
      PROJECT_GATE_ALL_FLAG
    ),
    propagateDependsOn: true as const
  });
}
