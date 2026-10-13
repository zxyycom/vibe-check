import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [source, output] = process.argv.slice(2);
assert(
  process.argv.length === 4 && source && output,
  "usage: count-projections.mjs <source> <output>"
);
const { defineConfig, run } = await import(pathToFileURL(resolve(source, "src/index.ts")).href);
const originalFreeze = Object.freeze;
const samples = [];
for (const size of [8, 16, 32]) {
  const counts = {
    shellSnapshots: 0,
    snapshotPendingIds: 0,
    snapshotSettledEntries: 0,
    candidateObjectFreezes: 0
  };
  const definition = defineConfig({
    checks: Array.from({ length: size }, (_, i) => ({
      checkId: `task-${i}`,
      displayName: `task-${i}`,
      execute: () => ({ status: "passed", data: {} })
    })),
    scheduler: { maxParallel: 4 },
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
  Object.freeze = function countedFreeze(value) {
    if (
      value &&
      typeof value === "object" &&
      "pendingTaskIds" in value &&
      "settledTasks" in value &&
      "graph" in value
    ) {
      counts.shellSnapshots++;
      counts.snapshotPendingIds += value.pendingTaskIds.length;
      counts.snapshotSettledEntries += value.settledTasks.length;
    }
    if (value && typeof value === "object" && "canAdmit" in value && "task" in value)
      counts.candidateObjectFreezes++;
    return originalFreeze(value);
  };
  try {
    const result = await run(definition, { projectRoot: "/workspace/vibe-check" });
    assert.equal(result.kind, "completed");
    assert.equal(result.aggregate, "passed");
    assert.equal(result.snapshot.checks.length, size);
    samples.push({ size, parallel: 4, ...counts });
  } finally {
    Object.freeze = originalFreeze;
  }
}
writeFileSync(
  output,
  JSON.stringify(
    {
      source,
      method:
        "complete public sourceAPI Run; temporary transparent freeze wrapper; counts only, no timing claims",
      runtime: process.version,
      samples
    },
    null,
    2
  ),
  { flag: "wx" }
);
console.log(JSON.stringify(samples));
