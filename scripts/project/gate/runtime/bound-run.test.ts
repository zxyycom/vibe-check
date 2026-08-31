import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

import { isNonArrayRecord } from "../../../value-guards.ts";
import { projectGateOutputOverrides } from "./bound-run.ts";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));

// Keep the test-name literal on its registration line so Test Evidence locations agree.
// prettier-ignore
it("binds the Product diagnostic log and standard machine facts to the Gate invocation directory", async () => {
  const testLogRoot = join(repositoryRoot, ".log", "project-gate-tests");
  mkdirSync(testLogRoot, { recursive: true });
  const invocationLogDirectory = mkdtempSync(join(testLogRoot, "output-override-"));
  try {
    const result = await run(
      defineConfig({
        checks: [
          defineCheck({
            checkId: "fixture-output-override",
            displayName: "Fixture output override",
            execution: () => ({ status: "passed", data: { completed: true } })
          })
        ],
        outputs: { progressRendering: { enabled: false } }
      }),
      {
        outputs: projectGateOutputOverrides(invocationLogDirectory),
        projectRoot: repositoryRoot
      }
    );

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.diagnosticLogging.enabled, true);
    assert.equal(result.outputs.machinePublication.enabled, true);
    assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
    assert.equal(result.outputs.machinePublication.status, "succeeded");
    assert.equal(result.outputs.progressRendering.status, "disabled");
    assert.deepEqual(projectGateOutputOverrides(invocationLogDirectory), {
      diagnosticLogging: {
        directory: relative(repositoryRoot, invocationLogDirectory),
        enabled: true
      },
      machinePublication: {
        directory: relative(repositoryRoot, invocationLogDirectory),
        enabled: true
      }
    });

    const diagnosticFile = result.outputs.diagnosticLogging.file;
    assert.notEqual(diagnosticFile, null);
    if (diagnosticFile === null) throw new Error("enabled Gate logging must expose its file");
    assert.equal(existsSync(join(repositoryRoot, diagnosticFile)), true);
    assert.equal(existsSync(join(invocationLogDirectory, "run.json")), true);
    assert.equal(existsSync(join(invocationLogDirectory, "records.ndjson")), true);

    const publishedRun: unknown = JSON.parse(
      readFileSync(join(invocationLogDirectory, "run.json"), "utf8")
    );
    assert.equal(isNonArrayRecord(publishedRun), true);
    if (!isNonArrayRecord(publishedRun))
      throw new Error("Gate run publication must be an object");
    assert.equal(Array.isArray(publishedRun.checks), true);
    if (!Array.isArray(publishedRun.checks))
      throw new Error("Gate run publication must contain Checks");
    assert.deepEqual(
      publishedRun.checks.map((check) => (isNonArrayRecord(check) ? check.checkId : undefined)),
      ["fixture-output-override"]
    );
    assert.deepEqual(diagnosticFileInventory(invocationLogDirectory), [
      "records.ndjson",
      relative(invocationLogDirectory, join(repositoryRoot, diagnosticFile)),
      "run.json"
    ]);
  } finally {
    rmSync(invocationLogDirectory, { force: true, recursive: true });
    assert.equal(existsSync(invocationLogDirectory), false);
  }
});

function diagnosticFileInventory(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const file of diagnosticFileInventory(path)) files.push(join(entry.name, file));
    } else if (entry.isFile()) {
      files.push(entry.name);
    }
  }
  return files.sort();
}
