import type { AdmissionCoreState } from "./admission-core/core.ts";
import {
  globalCapacityBlockerFactsForCore,
  pendingBlockerFactsForCore
} from "./admission-core/selection-query.ts";
import { taskSlotsForCore } from "./admission-core/state-query.ts";
import type { SchedulerBlockerSummary } from "./scheduler-decision-model.ts";

/** Aggregates Core facts with the diagnostic dependency -> mutex -> resource priority. */
export function summarizeSchedulerBlockers(core: AdmissionCoreState): SchedulerBlockerSummary {
  let dependency = 0;
  let mutex = 0;
  let resourceCapacity = 0;
  for (const slot of taskSlotsForCore(core, "pending")) {
    const facts = pendingBlockerFactsForCore(core, slot);
    if (facts.dependency) dependency += 1;
    else if (facts.mutex) mutex += 1;
    else if (facts.resourceCapacity) resourceCapacity += 1;
  }
  return Object.freeze({
    dependency,
    mutex,
    resourceCapacity,
    ...globalCapacityBlockerFactsForCore(core)
  });
}
