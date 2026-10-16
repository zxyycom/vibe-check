import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  PreparedCustomAdmissionStrategy
} from "../../project-definition/project-definition.ts";
import type {
  AdmissionPolicyInput,
  AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import {
  AdmissionPolicyFault,
  type AdmissionPolicyFaultCategory
} from "./scheduler-admission-decision.ts";
import {
  capacityForCore,
  activeScopeIdsForCore,
  taskIdsForCore
} from "./admission-core/scheduler-queries.ts";
import {
  normalizeSchedulerContextCallback,
  type NormalizedSchedulerContextCallback
} from "../../project-definition/scheduler-context-validation.ts";
import { admissionStateForCore } from "./admission-core/core.ts";

/** Adapts the public, trusted callback to the Scheduler's private pure policy seam. */
export function admissionSelectionPolicyFor(
  decide: PreparedCustomAdmissionStrategy["decide"]
): AdmissionSelectionPolicy {
  const consumer = normalizeSchedulerContextCallback("decision", decide);
  if (consumer === undefined) throw new TypeError("invalid custom scheduler decision callback");
  return Object.freeze({
    measurementNeeds: Object.freeze(
      consumer.contextNeeds.filter((key) => key === "cumulative" || key === "actionHistory")
    ),
    ...(consumer.contextNeeds.includes("cumulative") ||
    consumer.contextNeeds.includes("actionHistory")
      ? { requiresMeasurement: true as const }
      : {}),
    decide: (input: AdmissionPolicyInput) => invokeCustomPolicy(consumer, input)
  });
}

function invokeCustomPolicy(
  consumer: NormalizedSchedulerContextCallback<"decision">,
  input: AdmissionPolicyInput
): AdmissionProposal {
  let proposal: unknown;
  try {
    proposal = consumer.invoke(admissionPolicyContext(input, consumer.contextNeeds));
  } catch {
    throw new AdmissionPolicyFault("callback-threw");
  }
  if (isThenable(proposal)) throw new AdmissionPolicyFault("thenable-proposal");
  return validateProposal(proposal);
}

function admissionPolicyContext(
  input: AdmissionPolicyInput,
  needs: readonly (keyof AdmissionPolicyContext)[]
): Readonly<Partial<AdmissionPolicyContext>> {
  const core = input.admissionCore;
  const context: { -readonly [K in keyof AdmissionPolicyContext]?: AdmissionPolicyContext[K] } = {};
  for (const key of needs) {
    switch (key) {
      case "activeScopeIds":
        context.activeScopeIds = activeScopeIdsForCore(core);
        break;
      case "admissionState":
        context.admissionState = admissionStateForCore(core);
        break;
      case "candidates":
        context.candidates = Object.freeze(
          input.candidates.map((candidate) =>
            Object.freeze({ canAdmit: candidate.canAdmit, taskId: candidate.task.id })
          )
        );
        break;
      case "capacity":
        context.capacity = capacityForCore(core);
        break;
      case "graph":
        context.graph = input.graphSnapshot;
        break;
      case "cumulative":
        if (input.measurement?.cumulative === undefined)
          throw new Error("cumulative measurement was not enabled");
        context.cumulative = input.measurement.cumulative;
        break;
      case "actionHistory":
        if (input.measurement?.actionHistory === undefined)
          throw new Error("action history was not enabled");
        context.actionHistory = input.measurement.actionHistory;
        break;
      case "runningTaskIds":
        context.runningTaskIds = taskIdsForCore(core, "running");
        break;
      case "settledTaskIds":
        context.settledTaskIds = taskIdsForCore(core, "settled");
        break;
      case "runtime":
        context.runtime = Object.freeze({
          abortRequested: input.runtime.isAbortRequested,
          cancelled: input.runtime.isCancelled
        });
        break;
    }
  }
  return Object.freeze(context);
}

function validateProposal(value: unknown): AdmissionProposal {
  if (!isPlainRecord(value)) throw new AdmissionPolicyFault("malformed-proposal");
  try {
    return parseProposalRecord(value);
  } catch (error) {
    if (error instanceof AdmissionPolicyFault) throw error;
    throw new AdmissionPolicyFault("malformed-proposal");
  }
}

function parseProposalRecord(value: Record<string, unknown>): AdmissionProposal {
  switch (value.kind) {
    case "select":
      return parseSelectProposal(value);
    case "wait":
      return parseWaitProposal(value);
  }
  throw new AdmissionPolicyFault("malformed-proposal");
}

function parseSelectProposal(value: Record<string, unknown>): AdmissionProposal {
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== 2 ||
    !keys.includes("kind") ||
    !keys.includes("taskId") ||
    typeof value.taskId !== "string"
  ) {
    throw new AdmissionPolicyFault("malformed-proposal");
  }
  return Object.freeze({ kind: "select", taskId: value.taskId });
}

function parseWaitProposal(value: Record<string, unknown>): AdmissionProposal {
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 1 || keys[0] !== "kind") {
    throw new AdmissionPolicyFault("malformed-proposal");
  }
  return Object.freeze({ kind: "wait" });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function isThenable(value: unknown): boolean {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return false;
  try {
    return typeof Reflect.get(value, "then") === "function";
  } catch {
    return true;
  }
}

export type { AdmissionPolicyFaultCategory };
