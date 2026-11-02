import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { completed } from "../package-api-support/gate-example-acceptance.ts";

// #region package-api-example:gate-minimal
import { defineConfig, jsonValidation, run } from "@zxyycom/vibe-check";

const definition = defineConfig({
  checks: [
    jsonValidation({
      checkId: "config-json",
      files: { patterns: ["config/**/*.json"] }
    })
  ],
  outputs: { machinePublication: { enabled: false } }
});

async function runGate(projectRoot = process.cwd()) {
  const result = await run(definition, { projectRoot });
  process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
  return result;
}

if (import.meta.main) await runGate();
// #endregion package-api-example:gate-minimal

const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-minimal-"));
const emptyRoot = join(fixtureRoot, "empty");
const configPath = join(fixtureRoot, "config/app.json");
const previousDirectory = process.cwd();
const previousExitCode = process.exitCode;
try {
  mkdirSync(join(fixtureRoot, "config"));
  mkdirSync(emptyRoot);
  writeFileSync(configPath, '{"name":"demo"}\n');
  process.chdir(fixtureRoot);
  const valid = completed(await runGate());
  assert.equal(valid.aggregate, "passed");
  assert.equal(valid.snapshot.checks[0]?.outcome.status, "passed");
  assert.equal(valid.snapshot.records.length, 0);
  assert.equal(process.exitCode, 0);

  writeFileSync(configPath, '{"name": }\n');
  const invalid = completed(await runGate());
  assert.equal(invalid.aggregate, "failed");
  assert.equal(invalid.snapshot.checks[0]?.outcome.status, "failed");
  assert.equal(invalid.snapshot.records.length, 1);
  assert.equal(invalid.snapshot.records[0]?.data.path, "config/app.json");
  assert.equal(invalid.snapshot.records[0]?.data.reason, "invalid-json");
  assert.equal(process.exitCode, 1);

  // An unrelated cwd must not silently count as a successful validation.
  process.chdir(emptyRoot);
  const empty = completed(await runGate());
  assert.equal(empty.aggregate, "failed");
  const emptyOutcome = empty.snapshot.checks[0]?.outcome;
  assert.equal(emptyOutcome?.status, "not-applicable");
  if (emptyOutcome?.status !== "not-applicable") throw new Error("Expected no eligible input");
  assert.equal(emptyOutcome.reason?.code, "no-eligible-input");
  assert.equal(process.exitCode, 1);

  writeFileSync(configPath, '{"name":"demo"}\n');
  const explicitRoot = completed(await runGate(fixtureRoot));
  assert.equal(explicitRoot.aggregate, "passed");
  assert.equal(explicitRoot.snapshot.checks[0]?.outcome.status, "passed");
  assert.equal(process.exitCode, 0);
  assert.equal(existsSync(join(fixtureRoot, "artifacts")), false);
  assert.equal(existsSync(join(emptyRoot, "artifacts")), false);
} finally {
  process.chdir(previousDirectory);
  process.exitCode = previousExitCode;
  rmSync(fixtureRoot, { recursive: true, force: true });
}
