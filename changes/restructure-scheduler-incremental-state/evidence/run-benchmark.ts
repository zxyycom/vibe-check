import { createHash } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "../../src/project-definition/project-definition.ts";
import { defineCheck } from "../../src/check/check.ts";
import { defineContextCallback } from "../../src/package-tools/context-callback/define-context-callback.ts";
import { run } from "../../src/project-run/run.ts";
import { runTaskGraph } from "../../src/project-run/task-scheduler/scheduler.ts";
import { workload } from "./corpus.ts";

const rows: unknown[] = [];
const gc = () => { (globalThis as { gc?: () => void }).gc?.(); };
const directory = resolve("tmp/restructure-scheduler-incremental-state/diagnostic-runs");
mkdirSync(directory, { recursive: true });
let checksum = 0;
for (const size of [16, 256, 2048]) for (const shape of ["wide", "heterogeneous"] as const) {
  const input = workload(shape, size);
  for (const demand of ["static-none", "custom-minimal", "custom-full", "diagnostics", "cumulative", "terminal-run", "terminal-tasks", "mixed"] as const) {
    const needs = demand === "custom-full" || demand === "mixed"
      ? ["graph", "admissionState", "candidates", "capacity", "activeScopeIds", "runningTaskIds", "settledTaskIds", "cumulative", "actionHistory", "runtime"] as const
      : demand === "cumulative" ? ["candidates", "cumulative"] as const : ["candidates"] as const;
    const custom = ["custom-minimal", "custom-full", "cumulative", "mixed"].includes(demand);
    const terminalNeeds = demand === "mixed" ? ["graph", "execution", "runMeasurement", "taskTimings"] as const : demand === "terminal-run" ? ["runMeasurement"] as const : demand === "terminal-tasks" ? ["taskTimings"] as const : [] as const;
    const definition = defineConfig({
      checks: input.graph.tasks.map(task => defineCheck({
        checkId: task.id, displayName: task.id,
        admissionPriority: task.admissionPriority,
        ...(task.mutex ? { mutex: task.mutex } : {}),
        ...(task.resourceClaims ? { resourceClaims: task.resourceClaims } : {}),
        execute: () => ({ status: "passed" as const, data: {} })
      })),
      outputs: { machinePublication: { enabled: false }, progressRendering: { enabled: false }, diagnosticLogging: { enabled: demand === "diagnostics", directory } },
      scheduler: {
        maxParallel: input.maxParallel,
        ...(input.graph.resourceCapacities ? { resourceCapacities: input.graph.resourceCapacities } : {}),
        ...(custom ? { admissionPolicy: { kind: "custom" as const, strategy: { kind: "simple" as const, decide: defineContextCallback("scheduler.decide", { contextNeeds: needs, callback(context) {
          // Each declared field is genuinely read. Full catalog/history work is deliberate output demand.
          for (const key of needs) { const value = context[key as keyof typeof context]; if (key === "admissionState" && value) checksum += JSON.stringify((value as any).catalog).length; else if (key === "actionHistory" && value) checksum += (value as any).measurementCount; }
          const candidate = context.candidates.find(candidate => candidate.canAdmit);
          return candidate ? { kind: "select" as const, taskId: candidate.taskId } : { kind: "wait" as const };
        } }) } } } : {}),
        terminalEffects: [defineContextCallback("scheduler.terminal", { contextNeeds: terminalNeeds, callback(context) { checksum += JSON.stringify(context).length; } })]
      }
    });
    const operation = async () => {
      const result = await run(definition, { projectRoot: directory });
      if (result.kind !== "completed") throw new Error(`${demand}: ${JSON.stringify(result)}`);
      checksum++;
    };
    await operation(); gc();
    const samples = [];
    for (let iteration = 0; iteration < 7; iteration++) {
      gc(); const before = process.memoryUsage(); const start = performance.now();
      await operation();
      const elapsedMs = performance.now() - start; const after = process.memoryUsage(); gc();
      samples.push({ elapsedMs, heapGrowthBytes: after.heapUsed - before.heapUsed, retainedHeapBytes: process.memoryUsage().heapUsed - before.heapUsed, rssBytes: after.rss });
    }
    rows.push({ phase: "publicRun", shape, size, demand, samples });
  }
  const shellRun = () => runTaskGraph({ ...input, execute: () => 1 });
  await shellRun();
  const samples = [];
  for (let iteration = 0; iteration < 7; iteration++) { gc(); const start = performance.now(); await shellRun(); samples.push({ elapsedMs: performance.now() - start }); }
  rows.push({ phase: "schedulerRun", shape, size, demand: "static-none", samples });
}
console.log(JSON.stringify({ runtime: process.versions, sourceRevision: process.env.SOURCE_REVISION, harnessHash: createHash("sha256").update(readFileSync(new URL("./run-benchmark.ts", import.meta.url))).digest("hex"), repeats: 7, checksum, peakRssKiB: process.resourceUsage().maxRSS, rows }));
