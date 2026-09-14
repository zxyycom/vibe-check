import type {
  AdmissionPolicy,
  CustomAdmissionPreparationContext,
  PreparedCustomAdmissionStrategy,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";
import { snapshotClosedPolicyRecord } from "../../data-boundary/closed-values.ts";
import { admissionSelectionPolicyFor } from "../task-scheduler/custom-admission-policy.ts";
import type { PreparedAdmissionStrategy } from "./prepared-admission-strategy.ts";

/** Builds the exact Run-local Scheduler handoff and optional terminal participant for custom strategy. */
export async function prepareCustomAdmissionStrategy(
  policy: Extract<AdmissionPolicy, { readonly kind: "custom" }>,
  graph: SchedulerGraphSnapshot
): Promise<PreparedAdmissionStrategy> {
  const strategy = policy.strategy;
  if (strategy.kind === "simple") {
    return preparedCustomAdmissionStrategy({ decide: strategy.decide });
  }
  const prepared = await prepareCustomStrategy(strategy.prepare, Object.freeze({ graph }));
  return preparedCustomAdmissionStrategy(prepared);
}

async function prepareCustomStrategy(
  prepare: (
    this: void,
    context: CustomAdmissionPreparationContext
  ) => PreparedCustomAdmissionStrategy | Promise<PreparedCustomAdmissionStrategy>,
  context: CustomAdmissionPreparationContext
): Promise<PreparedCustomAdmissionStrategy> {
  let prepared: unknown;
  try {
    prepared = await prepare(context);
  } catch {
    throw new AdmissionStrategyPreparationFailure();
  }
  const record = snapshotClosedPolicyRecord(prepared, {
    optional: ["terminalEffect"],
    required: ["decide"]
  });
  if (record === undefined || !isPreparedCustomDecision(record.decide)) {
    throw new AdmissionStrategyPreparationFailure();
  }
  if (record.terminalEffect !== undefined && !isPreparedCustomCompletion(record.terminalEffect)) {
    throw new AdmissionStrategyPreparationFailure();
  }
  return Object.freeze({
    decide: record.decide,
    ...(record.terminalEffect === undefined ? {} : { terminalEffect: record.terminalEffect })
  });
}

function isPreparedCustomDecision(
  value: unknown
): value is PreparedCustomAdmissionStrategy["decide"] {
  return typeof value === "function";
}

function isPreparedCustomCompletion(
  value: unknown
): value is NonNullable<PreparedCustomAdmissionStrategy["terminalEffect"]> {
  return typeof value === "function";
}

function preparedCustomAdmissionStrategy(
  strategy: Pick<PreparedCustomAdmissionStrategy, "decide" | "terminalEffect">
): PreparedAdmissionStrategy {
  const completion =
    strategy.terminalEffect === undefined
      ? Object.freeze({ kind: "none" as const })
      : Object.freeze({
          kind: "terminal-effect" as const,
          terminalEffect: strategy.terminalEffect
        });
  return Object.freeze({
    admissionPolicy: admissionSelectionPolicyFor(strategy.decide),
    completion,
    requiresTerminalMeasurement: completion.kind === "terminal-effect"
  });
}

/** Raised only when public prepared custom strategy setup cannot form its exact Run-local closure. */
export class AdmissionStrategyPreparationFailure extends Error {}
