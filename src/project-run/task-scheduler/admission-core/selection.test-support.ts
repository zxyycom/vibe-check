import assert from "node:assert/strict";

import {
  selectAdmissionCore,
  settleRunningAdmissionCore,
  type AdmissionCoreState
} from "./core.ts";

export function selectedCore(core: AdmissionCoreState, taskId: string): AdmissionCoreState {
  const result = selectAdmissionCore(core, taskId);
  if (!result.accepted) assert.fail(`selection rejected: ${result.reason.kind}`);
  return result.transition.state;
}

export function settledCore(core: AdmissionCoreState, taskId: string): AdmissionCoreState {
  const result = settleRunningAdmissionCore(core, taskId, "completed");
  if (!result.accepted) assert.fail(`settlement rejected: ${result.reason.kind}`);
  return result.transition.state;
}
