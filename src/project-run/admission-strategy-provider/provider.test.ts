import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defineConfig,
  normalizeProjectDefinition,
  type AdmissionPolicy
} from "../../project-definition/project-definition.ts";
import { planStaticCheckGraph } from "../check-execution/plan.ts";
import { prepareTaskGraph } from "../task-scheduler/graph.ts";
import { staticAdmissionSelectionPolicy } from "../task-scheduler/admission-selection-policy.ts";
import { createAdmissionStrategyProvider } from "./provider.ts";

const PASSED = Object.freeze({ data: Object.freeze({}), status: "passed" as const });

describe("admission strategy provider", () => {
  it("prepares one closed static, custom, or learned-fallback policy without widening public configuration", async () => {
    const staticPrepared = await providerFor({ policy: { kind: "static" } }).prepare();
    assert.equal(staticPrepared.admissionPolicy, staticAdmissionSelectionPolicy);
    assert.equal(staticPrepared.requiresTerminalMeasurement, false);
    assert.equal(staticPrepared.admissionPolicy.requiresMeasurement, undefined);

    const customPrepared = await providerFor({
      policy: {
        kind: "custom",
        proposeAdmission: () => ({ kind: "wait" as const })
      }
    }).prepare();
    assert.equal(Object.isFrozen(customPrepared.admissionPolicy), true);
    assert.equal(customPrepared.admissionPolicy.requiresMeasurement, true);
    assert.equal(customPrepared.requiresTerminalMeasurement, true);

    const observations: string[] = [];
    const learnedFallback = await providerFor({
      flags: new Map(),
      observations,
      policy: { kind: "learned-critical-path", stateDirectory: "state" }
    }).prepare();
    assert.equal(learnedFallback.admissionPolicy, staticAdmissionSelectionPolicy);
    assert.equal(learnedFallback.requiresTerminalMeasurement, true);
    assert.deepEqual(observations, ["scheduler.history.prediction-unavailable"]);
  });
});

function providerFor(input: {
  readonly policy: AdmissionPolicy;
  readonly flags?: unknown;
  readonly observations?: string[];
}) {
  const observations = input.observations ?? [];
  const definition = defineConfig({
    checks: [
      {
        checkId: "check",
        displayName: "Check",
        execution: () => PASSED
      }
    ],
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: { admissionPolicy: input.policy }
  });
  const normalized = normalizeProjectDefinition(definition);
  const graph = prepareTaskGraph(
    planStaticCheckGraph(normalized.checks),
    normalized.declarative.scheduler.maxParallel
  );
  return createAdmissionStrategyProvider({
    admissionPolicy: normalized.scheduler.admissionPolicy,
    checks: normalized.checks,
    flags: input.flags ?? [],
    graph: graph.schedulerGraphSnapshot,
    observeDiagnostic: (observation) => observations.push(observation.event),
    projectRoot: process.cwd()
  });
}
