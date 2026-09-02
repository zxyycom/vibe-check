// #region package-api-example:learned-critical-path
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const executionOrder: string[] = [];

function delayedCheck(checkId: string, delayMs: number) {
  return defineCheck({
    checkId,
    displayName: checkId,
    async execution() {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      executionOrder.push(checkId);
      return { status: "passed" as const, data: {} };
    }
  });
}

// 以明显高于常见本地计时抖动的时长差演示 learned 排序。
const fast = delayedCheck("fast", 0);
const slow = delayedCheck("slow", 250);
const definition = defineConfig({
  checks: [fast, slow],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: {
      kind: "learned-critical-path",
      // 调用方拥有的本地目录相对 effective projectRoot 解析。
      stateDirectory: ".vibe-check/scheduler-history"
    },
    maxParallel: 1
  }
});

const first = await run(definition);
const second = await run(definition);
if (first.kind !== "completed" || second.kind !== "completed") {
  throw new Error("Expected both learned-scheduling Runs to complete");
}
if (executionOrder.join(",") !== "fast,slow,slow,fast") {
  throw new Error(`Unexpected learned scheduling order: ${executionOrder.join(",")}`);
}
// #endregion package-api-example:learned-critical-path
