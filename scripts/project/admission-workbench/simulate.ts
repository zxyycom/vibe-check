import { createAdmissionGraph } from "@zxyycom/vibe-check";

import {
  EVIDENCE_SCHEMA_VERSION,
  TRACE_VOCABULARY_ID,
  installedCandidateIdentity,
  scenarioEvidenceIdentity,
  sha256Json,
  type CandidateIdentity
} from "./evidence.ts";
import {
  staticIdentity,
  staticPolicy,
  type DecisionPolicy,
  type PolicyIdentity
} from "./policy.ts";
import { validateScenario, type Scenario } from "./scenario.ts";
import { runUntilComplete } from "./simulation-control.ts";
import {
  profileSetIdentity,
  resultFor,
  sampleScenarioWork,
  type SimulationIdentity
} from "./simulation-evidence.ts";
import { actionObservationPrefix, closePendingObservation } from "./simulation-observations.ts";
import {
  freezeValue,
  messageFor,
  normalizeFault,
  type Run,
  type SimulationEvidence,
  type SimulationResult,
  SimulationFault
} from "./simulation-types.ts";

export { staticPolicy } from "./policy.ts";
export type { SimulationEvidence, SimulationResult, TraceEvent } from "./simulation-types.ts";
export type Policy = DecisionPolicy;

export function simulate(
  scenarioInput: unknown,
  policy: DecisionPolicy = staticPolicy,
  seed = 0,
  replicate = 0,
  policyIdentity: PolicyIdentity = staticIdentity("static"),
  candidateIdentity: CandidateIdentity = installedCandidateIdentity()
): SimulationResult {
  const evidence = simulateEvidence(
    scenarioInput,
    policy,
    seed,
    replicate,
    policyIdentity,
    candidateIdentity
  );
  if (evidence.status === "error") {
    throw new SimulationFault(evidence.error.code, evidence.error.message);
  }
  return evidence;
}

export function simulateEvidence(
  scenarioInput: unknown,
  policy: DecisionPolicy,
  seed: number,
  replicate: number,
  policyIdentity: PolicyIdentity = staticIdentity("static"),
  candidateIdentity: CandidateIdentity = installedCandidateIdentity()
): SimulationEvidence {
  let scenario: Scenario | undefined;
  let run: Run | undefined;
  try {
    validateInvocation(seed, replicate, policy, policyIdentity);
    scenario = validateScenario(scenarioInput);
    if (!scenario.policyIds.some((policyId) => policyId === policyIdentity.policyId)) {
      throw new SimulationFault(
        "invalid-input",
        `scenario does not register policy ${policyIdentity.policyId}`
      );
    }
    run = createRun(scenario, seed, replicate);
    runUntilComplete(run, policy);
    closePendingObservation(run);
    return resultFor(run, { candidateIdentity, policyIdentity, replicate, seed });
  } catch (error) {
    return errorEvidence(error, run, scenario, {
      candidateIdentity,
      policyIdentity,
      replicate,
      seed
    });
  }
}

function validateInvocation(
  seed: number,
  replicate: number,
  policy: DecisionPolicy,
  policyIdentity: PolicyIdentity
): void {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new SimulationFault("invalid-input", "seed must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(replicate) || replicate < 0) {
    throw new SimulationFault("invalid-input", "replicate must be a non-negative safe integer");
  }
  if (typeof policy !== "function")
    throw new SimulationFault("invalid-input", "policy must be a function");
  if (!policyIdentity.policyId)
    throw new SimulationFault("invalid-input", "policy identity is required");
}

function createRun(scenario: Scenario, seed: number, replicate: number): Run {
  let state;
  try {
    state = createAdmissionGraph(scenario.graph).initialState();
  } catch (error) {
    throw new SimulationFault(
      "graph-rejected",
      messageFor(error, "public AdmissionGraph rejected graph")
    );
  }
  const sampledWork = sampleScenarioWork(scenario, seed, replicate);
  return {
    acceptedWaitCount: 0,
    admittedCount: 0,
    boundaryIndex: 0,
    coreEventCount: 0,
    declarativeFingerprint: sha256Json(scenario.graph.graph),
    effectiveCapacitySlotMs: 0,
    eventLimit: 4 * Math.max(1, scenario.graph.graph.tasks.length),
    maxRunning: 0,
    observations: [],
    peaks: {
      admissionViablePendingTaskCount: 0,
      admissiblePendingTaskCount: 0,
      capacityBlockedTaskCount: 0,
      mutexBlockedTaskCount: 0
    },
    pendingObservation: null,
    rates: new Map(),
    remainingWork: new Map(sampledWork.map(({ taskId, workMs }) => [taskId, workMs])),
    rootCapacitySlotMs: 0,
    sampledWork,
    scenario,
    slotTimeMs: 0,
    state,
    trace: [],
    unitTimeMs: Object.fromEntries(
      scenario.graph.graph.resourceCapacities.map(({ resourceId }) => [resourceId, 0])
    ),
    virtualTimeMs: 0
  };
}

function errorEvidence(
  error: unknown,
  run: Run | undefined,
  scenario: Scenario | undefined,
  identity: SimulationIdentity
): SimulationEvidence {
  const fault = normalizeFault(error);
  return freezeValue({
    actionObservations: actionObservationPrefix(run, true),
    boundaryIndex: run?.boundaryIndex ?? 0,
    candidateIdentity: identity.candidateIdentity,
    error: { code: fault.code, message: fault.message },
    policyIdentity: identity.policyIdentity,
    profileSetIdentity: scenario === undefined ? null : profileSetIdentity(scenario),
    replicate: validCounter(identity.replicate),
    scenarioIdentity: scenario === undefined ? null : scenarioEvidenceIdentity(scenario),
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    seed: validCounter(identity.seed),
    source: "virtual" as const,
    status: "error" as const,
    trace: run?.trace ?? [],
    traceVocabularyId: TRACE_VOCABULARY_ID,
    virtualTimeMs: run?.virtualTimeMs ?? 0
  });
}

function validCounter(value: number): number | null {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
