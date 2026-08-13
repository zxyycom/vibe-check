import type { ResolvedCheck, ResolvedCheckCatalog } from "./catalog.ts";
import {
  compareRunDiagnostics,
  type CheckRun,
  type RunDiagnostic
} from "./model.ts";
import {
  hasExactPlainRecordKeys,
  snapshotPlainRecord
} from "./plain-record-values.ts";

const WORK_HANDLE_PATTERN = /^work-handle\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EXECUTION_ID_PATTERN = /^execution\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/;

type AcknowledgementResult = "accepted" | "duplicate" | "rejected";

type TerminalOutcome = Readonly<
  | { kind: "returned"; result: unknown }
  | { kind: "unavailable"; dependencyId: string }
  | { kind: "execution-failed"; executionId: string }
>;

export type CheckTerminalReport = Readonly<
  | { status: "returned"; result: unknown }
  | { status: "unavailable"; dependencyId: string }
  | { status: "execution-failed"; executionId: string }
>;

export type CheckRunSettlement = Readonly<{
  availability: "available" | "unavailable";
}>;

export interface CheckRunSettlementInput {
  readonly checkId: string;
  readonly checkRunId: string;
  readonly report: unknown;
  readonly hasRecordFailure: boolean;
}

interface RunSettlementState {
  readonly availability: CheckRunSettlement["availability"];
  readonly outcome: TerminalOutcome | undefined;
  readonly hasRecordFailure: boolean;
}

function freezeDiagnostic(diagnostic: RunDiagnostic): RunDiagnostic {
  return Object.freeze({ ...diagnostic });
}

export class CheckManager {
  readonly #catalog: ResolvedCheckCatalog;
  readonly #acknowledged = new Map<string, Set<string>>();
  readonly #settlements = new Map<string, RunSettlementState>();
  readonly #diagnostics = new Map<string, RunDiagnostic[]>();
  #isFinalized = false;

  public constructor(catalog: ResolvedCheckCatalog) {
    this.#catalog = catalog;
    for (const check of catalog.checks) {
      if (check.applicability === "applicable") {
        this.#acknowledged.set(check.definition.checkId, new Set());
        this.#diagnostics.set(check.definition.checkId, []);
      }
    }
  }

  public createAcknowledgementPort(
    checkId: string,
    checkRunId: string
  ): (workHandle: string) => AcknowledgementResult {
    const check = this.#findApplicableCheck(checkId, checkRunId);
    if (check === undefined) {
      throw new TypeError("Acknowledgement port requires an applicable owned run");
    }
    return (workHandle: string): AcknowledgementResult => {
      if (this.#isFinalized) {
        return "rejected";
      }
      if (this.#settlements.has(checkId)) {
        return "rejected";
      }
      if (!check.workHandles.includes(workHandle)) {
        this.#addAckViolation(checkId, workHandle);
        return "rejected";
      }
      const acknowledged = this.#acknowledgementsFor(checkId);
      if (acknowledged.has(workHandle)) {
        return "duplicate";
      }
      acknowledged.add(workHandle);
      return "accepted";
    };
  }

  public settleRun(input: CheckRunSettlementInput): CheckRunSettlement {
    const { checkId, checkRunId, report, hasRecordFailure } = input;
    const check = this.#findApplicableCheck(checkId, checkRunId);
    if (this.#isFinalized || check === undefined || this.#settlements.has(checkId)
      || typeof hasRecordFailure !== "boolean") {
      throw new TypeError("Check run settlement requires one unsettled applicable owned run");
    }

    // Revoke the acknowledgement capability before deriving any terminal fact.
    // This transition is synchronous, so no caller can observe availability while
    // a port is still able to mutate its run.
    this.#settlements.set(checkId, Object.freeze({
      availability: "unavailable",
      outcome: undefined,
      hasRecordFailure
    }));
    const acknowledged = this.#acknowledgementsFor(checkId);
    for (const workHandle of check.workHandles) {
      if (!acknowledged.has(workHandle)) {
        this.#diagnosticsFor(checkId).push({ category: "ack-protocol", tieBreakKey: workHandle });
      }
    }
    const outcome = this.#resolveTerminalReport(check, report);
    const availability = outcome?.kind === "returned"
      && this.#diagnosticsFor(checkId).length === 0
      && !hasRecordFailure
      ? "available"
      : "unavailable";
    this.#settlements.set(checkId, Object.freeze({
      availability,
      outcome,
      hasRecordFailure
    }));
    return Object.freeze({ availability });
  }

  public finalize(
    additionalDiagnostics: ReadonlyMap<string, readonly RunDiagnostic[]> = new Map()
  ): readonly CheckRun[] {
    if (this.#isFinalized) {
      throw new TypeError("CheckManager is already finalized");
    }
    this.#isFinalized = true;

    for (const check of this.#catalog.checks) {
      if (check.applicability !== "applicable") {
        continue;
      }
      const checkId = check.definition.checkId;
      const settlement = this.#settlements.get(checkId);
      if (settlement === undefined) {
        throw new TypeError("CheckManager cannot finalize before every applicable run settles");
      }
      const recordDiagnostics = additionalDiagnostics.get(checkId) ?? [];
      if (settlement.hasRecordFailure !== (recordDiagnostics.length > 0)) {
        throw new TypeError("Check and Record settlement facts are inconsistent");
      }
      for (const diagnostic of recordDiagnostics) {
        this.#diagnosticsFor(checkId).push(freezeDiagnostic(diagnostic));
      }
    }

    const outcomes = new Map([...this.#settlements.entries()]
      .flatMap(([checkId, settlement]) => settlement.outcome === undefined
        ? []
        : [[checkId, settlement.outcome] as const]));
    const runs = this.#catalog.checks.map((check) => this.#finalizeRun(check, outcomes));
    for (const run of runs) {
      if (run.applicability !== "applicable") continue;
      const availability = this.#settlements.get(run.checkId)?.availability;
      if ((availability === "available") !== (run.status === "completed")) {
        throw new TypeError("Check settlement availability differs from final run status");
      }
    }
    return Object.freeze(runs);
  }

  #findApplicableCheck(checkId: string, checkRunId: string): ResolvedCheck | undefined {
    return this.#catalog.checks.find((check) => (
      check.definition.checkId === checkId
      && check.checkRunId === checkRunId
      && check.applicability === "applicable"
    ));
  }

  #acknowledgementsFor(checkId: string): Set<string> {
    const acknowledged = this.#acknowledged.get(checkId);
    if (acknowledged === undefined) {
      throw new TypeError(`CheckManager has no applicable acknowledgement owner: ${checkId}`);
    }
    return acknowledged;
  }

  #diagnosticsFor(checkId: string): RunDiagnostic[] {
    const diagnostics = this.#diagnostics.get(checkId);
    if (diagnostics === undefined) {
      throw new TypeError(`CheckManager has no applicable diagnostic owner: ${checkId}`);
    }
    return diagnostics;
  }

  #addAckViolation(checkId: string, workHandle: unknown): void {
    const tieBreakKey = typeof workHandle === "string" && WORK_HANDLE_PATTERN.test(workHandle)
      ? workHandle
      : "work-handle/v1:unknown";
    this.#diagnosticsFor(checkId).push({ category: "ack-protocol", tieBreakKey });
  }

  #resolveTerminalReport(check: ResolvedCheck, rawReport: unknown): TerminalOutcome | undefined {
    const checkId = check.definition.checkId;
    const report = snapshotPlainRecord(rawReport);
    if (report?.status === "returned"
      && hasExactPlainRecordKeys(report, ["status", "result"])) {
      const outcome = Object.freeze({ kind: "returned", result: report.result }) as TerminalOutcome;
      const candidate = snapshotPlainRecord(report.result);
      if (candidate === undefined || !hasExactPlainRecordKeys(candidate, ["verdict"])
        || (candidate.verdict !== "passed" && candidate.verdict !== "failed")) {
        this.#diagnosticsFor(checkId).push({
          category: "invalid-result",
          tieBreakKey: `result/v1:${checkId}`
        });
      }
      return outcome;
    }
    if (report?.status === "unavailable"
      && hasExactPlainRecordKeys(report, ["status", "dependencyId"])
      && typeof report.dependencyId === "string"
      && STABLE_ID_PATTERN.test(report.dependencyId)) {
      const outcome = Object.freeze({
        kind: "unavailable",
        dependencyId: report.dependencyId
      }) as TerminalOutcome;
      this.#diagnosticsFor(checkId).push({
        category: "unavailable",
        tieBreakKey: `dependency/v1:${report.dependencyId}`
      });
      return outcome;
    }
    if (report?.status === "execution-failed"
      && hasExactPlainRecordKeys(report, ["status", "executionId"])
      && typeof report.executionId === "string"
      && EXECUTION_ID_PATTERN.test(report.executionId)) {
      const outcome = Object.freeze({
        kind: "execution-failed",
        executionId: report.executionId
      }) as TerminalOutcome;
      this.#diagnosticsFor(checkId).push({
        category: "execution-failed",
        tieBreakKey: report.executionId
      });
      return outcome;
    }
    this.#diagnosticsFor(checkId).push({
      category: "invalid-result",
      tieBreakKey: `result/v1:${checkId}`
    });
    return undefined;
  }

  #finalizeRun(check: ResolvedCheck, outcomes: ReadonlyMap<string, TerminalOutcome>): CheckRun {
    const base = {
      checkId: check.definition.checkId,
      checkRunId: check.checkRunId
    } as const;
    if (check.selection === "unselected") {
      return Object.freeze({
        ...base,
        selection: "unselected",
        applicability: null,
        status: "skipped",
        result: null,
        coverage: null,
        diagnostic: null
      });
    }
    if (check.applicability === "not-applicable") {
      return Object.freeze({
        ...base,
        selection: "selected",
        applicability: "not-applicable",
        status: "completed",
        result: Object.freeze({ verdict: "not-applicable" }),
        coverage: Object.freeze({ plannedWorkCount: 0, acknowledgedWorkCount: 0 }),
        diagnostic: null
      });
    }

    const checkId = check.definition.checkId;
    const outcome = outcomes.get(checkId);
    const coverage = Object.freeze({
      plannedWorkCount: check.workHandles.length,
      acknowledgedWorkCount: this.#acknowledgementsFor(checkId).size
    });
    const diagnostics = this.#diagnosticsFor(checkId).sort(compareRunDiagnostics);
    const diagnostic = diagnostics[0];
    if (diagnostic !== undefined) {
      return Object.freeze({
        ...base,
        selection: "selected",
        applicability: "applicable",
        status: "failed",
        result: null,
        coverage,
        diagnostic: freezeDiagnostic(diagnostic)
      });
    }
    if (outcome?.kind !== "returned") {
      throw new TypeError("CheckManager terminal report resolution is inconsistent");
    }
    const result = snapshotPlainRecord(outcome.result);
    if (result === undefined || (result.verdict !== "passed" && result.verdict !== "failed")) {
      throw new TypeError("CheckManager completed result validation is inconsistent");
    }
    return Object.freeze({
      ...base,
      selection: "selected",
      applicability: "applicable",
      status: "completed",
      result: Object.freeze({ verdict: result.verdict as "failed" | "passed" }),
      coverage,
      diagnostic: null
    });
  }
}
