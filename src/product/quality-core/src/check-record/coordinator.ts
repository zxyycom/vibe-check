import type {
  CheckExecutionPorts,
  ResolvedCheckCatalog
} from "./catalog.ts";
import { CheckManager, type CheckTerminalReport } from "./check-manager.ts";
import type { FinalCoreSnapshot, SnapshotCompleteness } from "./model.ts";
import { RecordManager } from "./record-manager.ts";
import {
  runCheckOrchestration,
  type CheckOrchestrationContribution
} from "./task-orchestrator.ts";
import { validateFinalCoreSnapshot } from "./validation.ts";

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
  options: Readonly<{ schedulerPolicy: unknown }>
): Promise<FinalCoreSnapshot> {
  const checkManager = new CheckManager(catalog);
  const recordManager = new RecordManager(catalog);
  const contributions = Object.freeze(catalog.checks
    .filter((check) => check.applicability === "applicable")
    .map((check): CheckOrchestrationContribution => {
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
        check,
        ports,
        settle: (report: CheckTerminalReport) => {
          const checkId = check.definition.checkId;
          const checkRunId = check.checkRunId;
          const recordSettlement = recordManager.settleRun({ checkId, checkRunId });
          return checkManager.settleRun({
            checkId,
            checkRunId,
            report,
            hasRecordFailure: recordSettlement.hasRecordFailure
          });
        }
      });
    }));

  await runCheckOrchestration({ catalog, contributions, schedulerPolicy: options.schedulerPolicy });
  const recordState = recordManager.finalize();
  const runs = checkManager.finalize(recordState.diagnostics);
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
