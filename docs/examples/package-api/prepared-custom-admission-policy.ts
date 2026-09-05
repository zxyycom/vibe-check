// #region package-api-example:prepared-custom-admission-policy
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

type SchedulerSample = Readonly<{ readonly preferredTaskId: string }>;
const history: SchedulerSample[] = [];
const executionOrder: string[] = [];
const terminalEvents: string[] = [];

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execution() {
      executionOrder.push(checkId);
      return { status: "passed" as const, data: {} };
    }
  });
}

const first = scheduledCheck("first");
const second = scheduledCheck("second");
const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare({ graph }) {
      const previous = history.at(-1) ?? null;
      const taskIds = new Set(graph.tasks.map((task) => task.taskId));
      await Promise.resolve();
      return {
        decide(context) {
          const preferred = previous?.preferredTaskId;
          const preferredCandidate = context.candidates.find(
            ({ canAdmit, taskId }) => canAdmit && taskId === preferred && taskIds.has(taskId)
          );
          const next = preferredCandidate ?? context.candidates.find(({ canAdmit }) => canAdmit);
          return next === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: next.taskId };
        },
        complete(terminal) {
          const completeTasks = terminal.execution.settledTasks.every(
            ({ kind }) => kind === "completed"
          );
          const timing = terminal.rawMeasurement.timing;
          if (
            timing.availability === "available" &&
            terminal.execution.admittedTaskIds.length === terminal.execution.settledTasks.length &&
            completeTasks &&
            terminal.rawMeasurement.discrete.lastSettledTaskId !== null
          ) {
            history.push({ preferredTaskId: terminal.rawMeasurement.discrete.lastSettledTaskId });
          }
          terminalEvents.push("complete");
        }
      };
    }
  }
});

const definition = defineConfig({
  checks: [first, second],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: strategy,
    measurementHooks: [
      (terminal) => {
        if (terminal.execution.settledTasks.length !== 2) {
          throw new Error("Expected a terminal measurement for both Checks");
        }
        terminalEvents.push("generic");
      }
    ]
  }
});

const firstRun = await run(definition);
const secondRun = await run(definition);
if (firstRun.kind !== "completed" || secondRun.kind !== "completed") {
  throw new Error("Expected both Runs to complete");
}
if (history.length !== 2 || history[0]?.preferredTaskId !== "second") {
  throw new Error("Expected the first terminal measurement to seed caller-owned history");
}
if (executionOrder.join(",") !== "first,second,second,first") {
  throw new Error(`Unexpected execution order: ${executionOrder.join(",")}`);
}
if (terminalEvents.join(",") !== "generic,complete,generic,complete") {
  throw new Error("Expected generic hooks before prepared completion on both Runs");
}
// #endregion package-api-example:prepared-custom-admission-policy
