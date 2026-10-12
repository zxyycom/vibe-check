/** Independent correctness-review counterexample for C04, not a timing benchmark.
 * Uses the public package entry and actual Run; no production/test/Case changes or output I/O.
 * Proxy ownKeys counts authoring visits only, not all operations in Run. */
import assert from "node:assert/strict";
import { defineConfig, run, type Check } from "../../../../src/index.ts";

const depth = 4;
const samples: object[] = [];
for (const executable of [true, false]) {
  let executeCalls = 0;
  let ownKeys = 0;
  const wrap = <T extends object>(value: T): T => new Proxy(value, {
    ownKeys(target) {
      ownKeys += 1;
      return Reflect.ownKeys(target);
    }
  });
  let check: Check = wrap({
    checkId: "leaf",
    displayName: "leaf",
    ...(executable ? {
      execute: () => {
        executeCalls += 1;
        return { status: "passed" as const, data: {} };
      }
    } : {})
  });
  for (let level = 1; level <= depth; level += 1) {
    check = wrap({ checkId: `level-${level}`, displayName: "container", checks: [check, check] });
  }
  const result = await run(defineConfig({
    checks: [check],
    scheduler: { maxParallel: 1 },
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false },
      diagnosticLogging: { enabled: false }
    }
  }));
  assert.equal(ownKeys, 2 ** (depth + 1) - 1);
  assert.equal(executeCalls, 0);
  assert.equal(result.kind, executable ? "planning" : "completed");
  if (result.kind === "completed") assert.equal(result.snapshot.checks.length, 0);
  samples.push({
    executable,
    depth,
    distinctCheckObjects: depth + 1,
    ownKeys,
    executeCalls,
    resultKind: result.kind,
    definitionWarnings: result.definitionWarnings.length,
    diagnostic: "diagnostic" in result ? result.diagnostic : null,
    settledCheckCount: "snapshot" in result ? result.snapshot.checks.length : null
  });
}
console.log(JSON.stringify({
  baseline: "21777db37c0284308b8c69eb2cc92ab0b012cd9b",
  runtime: { bun: Bun.version, nodeCompatibility: process.versions.node },
  command: "mise exec -- bun run docs/investigations/_resources/261012-audit-checks-core-algorithmic-complexity/review-probe.ts",
  method: "Independent public defineConfig/run counterexample; authoring Proxy ownKeys counts, not elapsed time or whole-Run operation counts",
  samples
}, null, 2));
