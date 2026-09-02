import type {
  AdmissionPolicy,
  AdmissionPolicyContext,
  AdmissionProposal
} from "../../project-definition/project-definition.ts";
import type {
  AdmissionPolicyInput,
  AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import {
  AdmissionPolicyFault,
  type AdmissionPolicyFaultCategory
} from "./scheduler-admission-decision.ts";
import { capacityFor } from "./scheduler-decision-inspection.ts";

/** Adapts the public, trusted callback to the Scheduler's private pure policy seam. */
export function admissionSelectionPolicyFor(
  policy: AdmissionPolicy
): AdmissionSelectionPolicy | undefined {
  if (policy.kind === "static") return undefined;
  const customPolicy: AdmissionSelectionPolicy = Object.freeze({
    requiresMeasurement: true,
    decide: (input: AdmissionPolicyInput) => invokeCustomPolicy(policy.proposeAdmission, input)
  });
  return customPolicy;
}

function invokeCustomPolicy(
  proposeAdmission: Extract<AdmissionPolicy, { readonly kind: "custom" }>["proposeAdmission"],
  input: AdmissionPolicyInput
): AdmissionProposal {
  let proposal: unknown;
  try {
    proposal = proposeAdmission(admissionPolicyContext(input));
  } catch {
    throw new AdmissionPolicyFault("callback-threw");
  }
  if (isThenable(proposal)) throw new AdmissionPolicyFault("thenable-proposal");
  return validateProposal(proposal);
}

function admissionPolicyContext(input: AdmissionPolicyInput): AdmissionPolicyContext {
  if (input.measurement === undefined)
    throw new Error("custom admission policy requires measurement");
  return deepFreeze({
    activeScopeIds: [...input.inspection.activeScopeIds],
    candidates: input.candidates.map((candidate) => ({
      canAdmit: candidate.canAdmit,
      taskId: candidate.task.id
    })),
    capacity: capacityFor(input.inspection),
    measurement: input.measurement,
    graph: input.graphSnapshot,
    runningTaskIds: [...input.inspection.runningTaskIds],
    runtime: {
      abortRequested: input.inspection.isAbortRequested,
      cancelled: input.inspection.isCancelled
    },
    settledTaskIds: input.inspection.settledTasks.map((task) => task.taskId)
  });
}

function validateProposal(value: unknown): AdmissionProposal {
  if (!isPlainRecord(value)) throw new AdmissionPolicyFault("malformed-proposal");
  try {
    const keys = Reflect.ownKeys(value);
    if (value.kind === "select") {
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
    if (value.kind === "wait" && keys.length === 1 && keys[0] === "kind") {
      return Object.freeze({ kind: "wait" });
    }
  } catch (error) {
    if (error instanceof AdmissionPolicyFault) throw error;
    throw new AdmissionPolicyFault("malformed-proposal");
  }
  throw new AdmissionPolicyFault("malformed-proposal");
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

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

export type { AdmissionPolicyFaultCategory };
