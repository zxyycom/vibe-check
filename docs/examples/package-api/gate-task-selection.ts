import {
  quietControls,
  completed,
  checkStatusesFor
} from "../package-api-support/gate-example-acceptance.ts";

import assert from "node:assert/strict";

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

function writeFixture(path: string, content: string) {
  const target = join(fixtureRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

// #region package-api-example:gate-task-selection
import { any, defineConfig, jsonValidation, markdownLint, run } from "@zxyycom/vibe-check";

const definition = defineConfig({
  checks: [
    jsonValidation({
      checkId: "config",
      files: { include: ["config/**/*.json"] },
      enabledByFlags: { when: any("local", "ci", "config") }
    }),
    markdownLint({
      checkId: "docs",
      files: { include: ["handbook/**/*.md"] },
      findingPolicy: "blocking",
      enabledByFlags: { when: any("ci", "docs") }
    })
  ],
  outputs: { machinePublication: { enabled: false } }
});

async function runGate() {
  const result = await run(definition, { flags: ["local"] });
  process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
  return result;
}

if (import.meta.main) await runGate();
// #endregion package-api-example:gate-task-selection

const statuses = checkStatusesFor(definition);
const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-selection-"));
const previousDirectory = process.cwd();
const previousExitCode = process.exitCode;
try {
  writeFixture("config/app.json", '{"name":"app"}\n');
  writeFixture("handbook/index.md", "# Handbook\n\nA valid handbook.\n");
  // The projected entry intentionally uses the default caller root.
  process.chdir(fixtureRoot);
  const result = await runGate();
  assert.deepEqual(statuses(result), ["passed", "not-applicable"]);
  assert.equal(completed(result).aggregate, "passed");
  assert.equal(process.exitCode, 0);
  assert.deepEqual(statuses(await run(definition, { ...quietControls, flags: ["ci"] })), [
    "passed",
    "passed"
  ]);
  assert.deepEqual(statuses(await run(definition, { ...quietControls, flags: ["docs"] })), [
    "not-applicable",
    "passed"
  ]);
} finally {
  process.chdir(previousDirectory);
  process.exitCode = previousExitCode;
  rmSync(fixtureRoot, { recursive: true, force: true });
}
