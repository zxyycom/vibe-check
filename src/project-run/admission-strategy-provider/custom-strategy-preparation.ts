import {
  normalizeSchedulerContextCallback,
  snapshotSchedulerContextCallback
} from "../../project-definition/scheduler-context-validation.ts";
import type {
  AdmissionPolicy,
  CustomAdmissionPreparationContext,
  CustomAdmissionStrategy,
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
  prepare: Extract<CustomAdmissionStrategy, { kind: "prepared" }>["prepare"],
  context: CustomAdmissionPreparationContext
): Promise<PreparedCustomAdmissionStrategy> {
  let prepared: unknown;
  try {
    const callback = normalizeSchedulerContextCallback("preparation", prepare);
    if (callback === undefined) throw new AdmissionStrategyPreparationFailure();
    prepared = await callback.invoke(
      callback.contextNeeds.includes("graph") ? context : Object.freeze({})
    );
  } catch {
    throw new AdmissionStrategyPreparationFailure();
  }
  const record = snapshotClosedPolicyRecord(prepared, {
    optional: ["terminalEffect"],
    required: ["decide"]
  });
  if (record === undefined) throw new AdmissionStrategyPreparationFailure();
  const decide = snapshotSchedulerContextCallback("decision", record.decide);
  const terminalEffect =
    record.terminalEffect === undefined
      ? undefined
      : snapshotSchedulerContextCallback("terminal", record.terminalEffect);
  if (decide === undefined || (record.terminalEffect !== undefined && terminalEffect === undefined))
    throw new AdmissionStrategyPreparationFailure();
  return Object.freeze({ decide, ...(terminalEffect === undefined ? {} : { terminalEffect }) });
}

function preparedCustomAdmissionStrategy(
  strategy: Pick<PreparedCustomAdmissionStrategy, "decide" | "terminalEffect">
): PreparedAdmissionStrategy {
  const terminal =
    strategy.terminalEffect === undefined
      ? undefined
      : normalizeSchedulerContextCallback("terminal", strategy.terminalEffect);
  if (strategy.terminalEffect !== undefined && terminal === undefined)
    throw new AdmissionStrategyPreparationFailure();
  const completion =
    terminal === undefined
      ? Object.freeze({ kind: "none" as const })
      : Object.freeze({
          kind: "terminal-effect" as const,
          terminalEffect: terminal
        });
  return Object.freeze({
    admissionPolicy: admissionSelectionPolicyFor(strategy.decide),
    completion,
    requiresTerminalMeasurement: terminal?.contextNeeds.includes("rawMeasurement") === true,
    ...(terminal === undefined ? {} : { terminalContextNeeds: terminal.contextNeeds })
  });
}

/** Raised only when public prepared custom strategy setup cannot form its exact Run-local closure. */
export class AdmissionStrategyPreparationFailure extends Error {}
