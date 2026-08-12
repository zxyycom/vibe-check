import type {
  CheckExecutionBinding,
  CheckExecutionPorts,
  ResolvedCheckCatalog
} from "./catalog.ts";
import { CheckManager } from "./check-manager.ts";
import type { FinalCoreSnapshot, SnapshotCompleteness } from "./model.ts";
import { RecordManager } from "./record-manager.ts";
import { validateFinalCoreSnapshot } from "./validation.ts";

export interface CheckExecutionContribution {
  readonly checkId: string;
  readonly checkRunId: string;
  readonly workHandles: readonly string[];
  readonly ports: CheckExecutionPorts;
  readonly execute: CheckExecutionBinding;
}

export type ContributionCoordinator = (
  contributions: readonly CheckExecutionContribution[]
) => readonly unknown[] | Promise<readonly unknown[]>;

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

function unavailableDependency(value: unknown): string | undefined {
  const data = snapshotData(value);
  if (data === undefined || Object.keys(data).length !== 2
    || data.status !== "unavailable" || typeof data.dependencyId !== "string") {
    return undefined;
  }
  return data.dependencyId;
}

async function runDirectContribution(
  contribution: CheckExecutionContribution
): Promise<Readonly<Record<string, unknown>>> {
  try {
    const returned = await contribution.execute(contribution.ports);
    const dependencyId = unavailableDependency(returned);
    if (dependencyId !== undefined) {
      return Object.freeze({
        checkId: contribution.checkId,
        checkRunId: contribution.checkRunId,
        status: "unavailable",
        dependencyId
      });
    }
    return Object.freeze({
      checkId: contribution.checkId,
      checkRunId: contribution.checkRunId,
      status: "returned",
      result: returned
    });
  } catch {
    return Object.freeze({
      checkId: contribution.checkId,
      checkRunId: contribution.checkRunId,
      status: "execution-failed",
      executionId: `execution/v1:runner-${contribution.checkId}`
    });
  }
}

async function runDirectBatch(
  contributions: readonly CheckExecutionContribution[],
  checkManager: CheckManager,
  recordManager: RecordManager
): Promise<readonly unknown[]> {
  return Promise.all(contributions.map(async (contribution) => {
    try {
      return await runDirectContribution(contribution);
    } finally {
      checkManager.closeRun(contribution.checkId, contribution.checkRunId);
      recordManager.closeRun(contribution.checkId, contribution.checkRunId);
    }
  }));
}

function deriveCompleteness(snapshotRuns: FinalCoreSnapshot["runs"]): SnapshotCompleteness {
  const selectedRuns = snapshotRuns.filter((run) => run.selection === "selected");
  return Object.freeze({
    status: selectedRuns.some((run) => run.status === "failed") ? "incomplete" : "complete",
    selectedRunCount: selectedRuns.length,
    completedRunCount: selectedRuns.filter((run) => run.status === "completed").length,
    failedRunCount: selectedRuns.filter((run) => run.status === "failed").length,
    plannedWorkCount: selectedRuns.reduce((sum, run) => sum + run.coverage.plannedWorkCount, 0),
    acknowledgedWorkCount: selectedRuns.reduce((sum, run) => (
      sum + run.coverage.acknowledgedWorkCount
    ), 0)
  });
}

export async function coordinateCheckRecords(
  catalog: ResolvedCheckCatalog,
  options: Readonly<{ coordinate?: ContributionCoordinator }> = {}
): Promise<FinalCoreSnapshot> {
  const checkManager = new CheckManager(catalog);
  const recordManager = new RecordManager(catalog);
  const contributions = Object.freeze(catalog.checks
    .filter((check) => check.applicability === "applicable")
    .map((check): CheckExecutionContribution => {
      const acknowledge = checkManager.createAcknowledgementPort(
        check.definition.checkId,
        check.checkRunId
      );
      const submitRecord = recordManager.createBoundSink(
        check.definition.checkId,
        check.checkRunId
      );
      const ports: CheckExecutionPorts = Object.freeze({
        workHandles: check.workHandles,
        acknowledge,
        submitRecord
      });
      return Object.freeze({
        checkId: check.definition.checkId,
        checkRunId: check.checkRunId,
        workHandles: check.workHandles,
        ports,
        execute: check.binding
      });
    }));

  let reports: readonly unknown[];
  try {
    reports = options.coordinate === undefined
      ? await runDirectBatch(contributions, checkManager, recordManager)
      : await options.coordinate(contributions);
    if (!Array.isArray(reports)) {
      reports = [];
    }
  } catch {
    reports = contributions.map((contribution) => Object.freeze({
      checkId: contribution.checkId,
      checkRunId: contribution.checkRunId,
      status: "execution-failed",
      executionId: `execution/v1:runner-${contribution.checkId}`
    }));
  }

  for (const contribution of contributions) {
    checkManager.closeRun(contribution.checkId, contribution.checkRunId);
    recordManager.closeRun(contribution.checkId, contribution.checkRunId);
  }
  const recordState = recordManager.finalize();
  const runs = checkManager.finalize(reports, recordState.diagnostics);
  const candidate: FinalCoreSnapshot = {
    catalogFingerprint: catalog.catalogFingerprint,
    definitions: catalog.definitions,
    runs,
    records: recordState.records,
    integrity: recordState.integrity,
    completeness: deriveCompleteness(runs)
  };
  const validated = validateFinalCoreSnapshot(candidate);
  if (!validated.ok) {
    throw new TypeError("Final Core snapshot failed foundation validation");
  }
  return validated.value;
}
