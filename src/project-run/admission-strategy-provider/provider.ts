import type {
  AdmissionPolicy,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";
import { staticAdmissionSelectionPolicy } from "../task-scheduler/admission-selection-policy.ts";
import { prepareCustomAdmissionStrategy } from "./custom-strategy-preparation.ts";
import type { PreparedAdmissionStrategy } from "./prepared-admission-strategy.ts";

export interface PrivateAdmissionStrategyProvider {
  prepare: () => Promise<PreparedAdmissionStrategy>;
}

/** Product-private test seam; package `run` never accepts a provider factory. */
export type AdmissionStrategyProviderFactory = (
  input: AdmissionStrategyProviderInput
) => PrivateAdmissionStrategyProvider;

export interface AdmissionStrategyProviderInput {
  readonly admissionPolicy: AdmissionPolicy;
  readonly graph: SchedulerGraphSnapshot;
}

/** Resolves the closed Product policy union to one invocation-scoped prepared strategy. */
export function createAdmissionStrategyProvider(
  input: AdmissionStrategyProviderInput
): PrivateAdmissionStrategyProvider {
  return Object.freeze({
    prepare: async () => {
      switch (input.admissionPolicy.kind) {
        case "static":
          return staticPreparedStrategy();
        case "custom":
          return prepareCustomAdmissionStrategy(input.admissionPolicy, input.graph);
      }
    }
  });
}

function staticPreparedStrategy(): PreparedAdmissionStrategy {
  return Object.freeze({
    admissionPolicy: staticAdmissionSelectionPolicy,
    completion: Object.freeze({ kind: "none" as const }),
    requiresTerminalMeasurement: false
  });
}
