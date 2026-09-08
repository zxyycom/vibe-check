import type { SchedulerGraphSnapshot } from "@zxyycom/vibe-check";

import { freezeScenario, type Profile, type ResourceUnits, type Scenario } from "./scenario.ts";

export function profile(
  id: string,
  nominalWorkMs: number,
  multiplierSamples: readonly number[],
  resourceClaims: readonly ResourceUnits[] = []
): Profile {
  return freezeScenario({ id, multiplierSamples, nominalWorkMs, resourceClaims });
}

export function task(
  taskId: string,
  options: Readonly<{
    readonly claims?: readonly ResourceUnits[];
    readonly dependsOn?: readonly string[];
    readonly mutex?: readonly string[];
    readonly observes?: readonly string[];
    readonly priority?: number;
    readonly scopeId?: string | null;
  }> = {}
): SchedulerGraphSnapshot["tasks"][number] {
  const {
    claims: resourceClaims = [],
    dependsOn = [],
    mutex = [],
    observes = [],
    priority: admissionPriority = 0,
    scopeId = null
  } = options;
  return freezeScenario({
    admissionPriority,
    dependsOn,
    mutex,
    observes,
    resourceClaims,
    scopeId,
    taskId
  });
}

export function fixture(input: Scenario): Scenario {
  return freezeScenario(input);
}
