import { all, any, changeFlag, type Check, type CheckFlagEnablement } from "@zxyycom/vibe-check";

import {
  PROJECT_GATE_ALL_FLAG,
  PROJECT_GATE_REQUIRED_FLAG,
  projectGatePresetFlag
} from "./controls.ts";
import type { ProjectGateEntry } from "./entries.ts";

const PROJECT_GATE_PRODUCT_RUNTIME_TEST_CHECK_ID = "tests-product-runtime";
const PROJECT_GATE_INCREMENTAL_REPOSITORY_MATERIAL_CHECK_IDS = new Set([
  "materials-json-validator",
  "materials-schema-validator",
  "materials-schema-publication-validator",
  "materials-examples-validator"
]);
/**
 * Adds the Gate-owned native flag condition without mutating the owning Check
 * object. A selected Gate Check may activate its `dependsOn` prerequisites;
 * the Product still excludes `observes` from that propagation.
 */
export function projectGateFlagControlledCheck(entry: ProjectGateEntry): Check {
  const incrementalEnablement = incrementalRepositoryMaterialEnablement(entry);
  if (incrementalEnablement !== undefined) {
    return Object.freeze({ ...entry.check, enabledByFlags: incrementalEnablement });
  }
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

/**
 * Limits only material Checks whose complete inputs are described by the
 * repository-material region. Link validation stays on its normal full path:
 * a changed target outside a Markdown source is a reverse dependency that the
 * region does not model.
 */
function incrementalRepositoryMaterialEnablement(
  entry: ProjectGateEntry
): CheckFlagEnablement | undefined {
  if (!PROJECT_GATE_INCREMENTAL_REPOSITORY_MATERIAL_CHECK_IDS.has(entry.check.checkId)) {
    return undefined;
  }
  return Object.freeze({
    when: any(
      all(PROJECT_GATE_REQUIRED_FLAG, changeFlag("repository-material")),
      projectGatePresetFlag("materials"),
      PROJECT_GATE_ALL_FLAG
    ),
    propagateDependsOn: true as const
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
