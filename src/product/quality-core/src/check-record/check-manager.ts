import type { ResolvedCheck, ResolvedCheckCatalog } from "./catalog.ts";
import {
  compareRunDiagnostics,
  type CheckRun,
  type RunDiagnostic
} from "./model.ts";

const WORK_HANDLE_PATTERN = /^work-handle\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EXECUTION_ID_PATTERN = /^execution\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/;

type AcknowledgementResult = "accepted" | "duplicate" | "rejected";

type TerminalOutcome = Readonly<
  | { kind: "returned"; result: unknown }
  | { kind: "unavailable"; dependencyId: string }
  | { kind: "execution-failed"; executionId: string }
>;

function snapshotData(value: unknown): Readonly<Record<string, unknown>> | undefined {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      return undefined;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Readonly<
      Record<string, PropertyDescriptor>
    >;
    if (Object.values(descriptors).some((descriptor) => (
      descriptor.get !== undefined || descriptor.set !== undefined
    ))) {
      return undefined;
    }
    return Object.fromEntries(Object.entries(descriptors)
      .filter(([, descriptor]) => descriptor.enumerable === true)
      .map(([key, descriptor]) => [key, descriptor.value as unknown]));
  } catch {
    return undefined;
  }
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function freezeDiagnostic(diagnostic: RunDiagnostic): RunDiagnostic {
  return Object.freeze({ ...diagnostic });
}

export class CheckManager {
  readonly #catalog: ResolvedCheckCatalog;
  readonly #acknowledged = new Map<string, Set<string>>();
  readonly #closedRuns = new Set<string>();
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
      if (this.#closedRuns.has(checkId)) {
        this.#addAckViolation(checkId, workHandle);
        return "rejected";
      }
      if (!check.workHandles.includes(workHandle)) {
        this.#addAckViolation(checkId, workHandle);
        return "rejected";
      }
      const acknowledged = this.#acknowledged.get(checkId)!;
      if (acknowledged.has(workHandle)) {
        return "duplicate";
      }
      acknowledged.add(workHandle);
      return "accepted";
    };
  }

  public closeRun(checkId: string, checkRunId: string): void {
    if (!this.#isFinalized && this.#findApplicableCheck(checkId, checkRunId) !== undefined) {
      this.#closedRuns.add(checkId);
    }
  }

  public finalize(
    rawReports: readonly unknown[],
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
      this.#closedRuns.add(check.definition.checkId);
      const acknowledged = this.#acknowledged.get(check.definition.checkId)!;
      for (const workHandle of check.workHandles) {
        if (!acknowledged.has(workHandle)) {
          this.#diagnostics.get(check.definition.checkId)!.push({
            category: "ack-protocol",
            tieBreakKey: workHandle
          });
        }
      }
      for (const diagnostic of additionalDiagnostics.get(check.definition.checkId) ?? []) {
        this.#diagnostics.get(check.definition.checkId)!.push(freezeDiagnostic(diagnostic));
      }
    }

    const outcomes = this.#resolveTerminalReports(rawReports);
    const runs = this.#catalog.checks.map((check) => this.#finalizeRun(check, outcomes));
    return Object.freeze(runs);
  }

  #findApplicableCheck(checkId: string, checkRunId: string): ResolvedCheck | undefined {
    return this.#catalog.checks.find((check) => (
      check.definition.checkId === checkId
      && check.checkRunId === checkRunId
      && check.applicability === "applicable"
    ));
  }

  #addAckViolation(checkId: string, workHandle: unknown): void {
    const tieBreakKey = typeof workHandle === "string" && WORK_HANDLE_PATTERN.test(workHandle)
      ? workHandle
      : "work-handle/v1:unknown";
    this.#diagnostics.get(checkId)?.push({ category: "ack-protocol", tieBreakKey });
  }

  #addTerminalReportViolation(checkId: string, kind: "duplicate" | "missing" | "unknown"): void {
    this.#diagnostics.get(checkId)?.push({
      category: "terminal-report-set",
      tieBreakKey: kind === "unknown"
        ? "terminal-report/v1:unknown"
        : `terminal-report/v1:${kind}-${checkId}`
    });
  }

  #resolveTerminalReports(rawReports: readonly unknown[]): ReadonlyMap<string, TerminalOutcome> {
    const applicableChecks = this.#catalog.checks.filter((check) => check.applicability === "applicable");
    const outcomes = new Map<string, TerminalOutcome>();
    const seen = new Set<string>();

    for (const rawReport of rawReports) {
      const report = snapshotData(rawReport);
      if (report === undefined) {
        const first = applicableChecks[0];
        if (first !== undefined) {
          this.#addTerminalReportViolation(first.definition.checkId, "unknown");
        }
        continue;
      }
      const check = typeof report.checkId === "string" && typeof report.checkRunId === "string"
        ? this.#findApplicableCheck(report.checkId, report.checkRunId)
        : undefined;
      if (check === undefined) {
        const first = applicableChecks[0];
        if (first !== undefined) {
          this.#addTerminalReportViolation(first.definition.checkId, "unknown");
        }
        continue;
      }
      const checkId = check.definition.checkId;
      if (seen.has(checkId)) {
        this.#addTerminalReportViolation(checkId, "duplicate");
        continue;
      }
      seen.add(checkId);

      if (report.status === "returned"
        && hasExactKeys(report, ["checkId", "checkRunId", "status", "result"])) {
        outcomes.set(checkId, Object.freeze({ kind: "returned", result: report.result }));
        continue;
      }
      if (report.status === "unavailable"
        && hasExactKeys(report, ["checkId", "checkRunId", "status", "dependencyId"])) {
        if (typeof report.dependencyId === "string" && STABLE_ID_PATTERN.test(report.dependencyId)) {
          outcomes.set(checkId, Object.freeze({
            kind: "unavailable",
            dependencyId: report.dependencyId
          }));
        } else {
          this.#diagnostics.get(checkId)!.push({
            category: "invalid-result",
            tieBreakKey: `result/v1:${checkId}`
          });
        }
        continue;
      }
      if (report.status === "execution-failed"
        && hasExactKeys(report, ["checkId", "checkRunId", "status", "executionId"])) {
        if (typeof report.executionId === "string" && EXECUTION_ID_PATTERN.test(report.executionId)) {
          outcomes.set(checkId, Object.freeze({
            kind: "execution-failed",
            executionId: report.executionId
          }));
        } else {
          this.#diagnostics.get(checkId)!.push({
            category: "invalid-result",
            tieBreakKey: `result/v1:${checkId}`
          });
        }
        continue;
      }
      this.#addTerminalReportViolation(checkId, "unknown");
    }

    for (const check of applicableChecks) {
      const checkId = check.definition.checkId;
      if (!seen.has(checkId)) {
        this.#addTerminalReportViolation(checkId, "missing");
      }
    }
    return outcomes;
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
    if (outcome?.kind === "unavailable") {
      this.#diagnostics.get(checkId)!.push({
        category: "unavailable",
        tieBreakKey: `dependency/v1:${outcome.dependencyId}`
      });
    } else if (outcome?.kind === "execution-failed") {
      this.#diagnostics.get(checkId)!.push({
        category: "execution-failed",
        tieBreakKey: outcome.executionId
      });
    } else if (outcome?.kind === "returned") {
      const candidate = snapshotData(outcome.result);
      if (candidate === undefined || !hasExactKeys(candidate, ["verdict"])
        || (candidate.verdict !== "passed" && candidate.verdict !== "failed")) {
        this.#diagnostics.get(checkId)!.push({
          category: "invalid-result",
          tieBreakKey: `result/v1:${checkId}`
        });
      }
    }

    const coverage = Object.freeze({
      plannedWorkCount: check.workHandles.length,
      acknowledgedWorkCount: this.#acknowledged.get(checkId)!.size
    });
    const diagnostics = this.#diagnostics.get(checkId)!.sort(compareRunDiagnostics);
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
    const result = snapshotData(outcome.result)!;
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
