// #region package-api-example:prepared-custom-admission-policy
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const events: string[] = [];
const check = defineCheck({
  checkId: "check",
  displayName: "Check",
  execution: () => ({ status: "passed" as const, data: {} })
});

const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare({ graph }) {
      const taskIds = new Set(graph.tasks.map((task) => task.taskId));
      await Promise.resolve();
      return {
        decide(context) {
          const candidate = context.candidates.find(
            ({ taskId, canAdmit }) => canAdmit && taskIds.has(taskId)
          );
          return candidate === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: candidate.taskId };
        },
        complete(terminal) {
          if (!Object.isFrozen(terminal) || terminal.execution.settledTasks.length !== 1) {
            throw new Error("Expected one sealed terminal measurement");
          }
          events.push("complete");
        }
      };
    }
  }
});

const result = await run(
  defineConfig({
    checks: [check],
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: { admissionPolicy: strategy }
  })
);
if (result.kind !== "completed" || result.outputs.measurementHooks.status !== "succeeded") {
  throw new Error(`Run did not complete its prepared strategy: ${result.kind}`);
}
if (events.join(",") !== "complete") throw new Error("Prepared completion was not delivered");
// #endregion package-api-example:prepared-custom-admission-policy
