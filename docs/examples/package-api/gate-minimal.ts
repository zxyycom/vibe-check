import assert from "node:assert/strict";

const previousExitCode = process.exitCode;

// #region package-api-example:gate-minimal
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const bundleSize = defineCheck({
  checkId: "bundle-size",
  displayName: "Bundle size",
  execute() {
    const actualBytes = 82_000;
    const maximumBytes = 100_000;
    const data = { actualBytes, maximumBytes };
    return actualBytes <= maximumBytes ? { status: "passed", data } : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [bundleSize],
  outputs: { machinePublication: { enabled: false } }
});

const result = await run(definition);
process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
// #endregion package-api-example:gate-minimal

try {
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") throw new Error("Minimal Run did not complete");
  assert.equal(result.aggregate, "passed");
  assert.equal(result.snapshot.checks[0]?.outcome.status, "passed");
  assert.equal(process.exitCode, 0);
} finally {
  process.exitCode = previousExitCode;
}
