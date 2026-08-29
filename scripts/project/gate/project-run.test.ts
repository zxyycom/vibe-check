import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

import { preparePackageCandidate } from "../../package/candidate/prepare.ts";
import { selectionFlags } from "./controls.ts";

const repositoryRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

it("binds the Product diagnostic log to the Gate invocation directory", async () => {
  const invocationLogRoot = join(repositoryRoot, ".log", "project-gate");
  mkdirSync(invocationLogRoot, { recursive: true });
  const invocationLogDirectory = mkdtempSync(join(invocationLogRoot, "fixture-"));
  try {
    const preparedCandidate = await preparePackageCandidate();
    const { runProjectGate } = await import("./project-run.ts");
    const controller = new AbortController();
    controller.abort();

    const result = await runProjectGate({
      flags: selectionFlags({ disabledTags: [], enabledTags: [], profile: "required" }),
      invocationLogDirectory,
      preparedCandidate,
      signal: controller.signal
    });

    assert.equal(result.kind, "cancelled");
    assert.equal(result.outputs.diagnosticLogging.enabled, true);
    assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
    assert.match(result.outputs.diagnosticLogging.file ?? "", /^\.log\/project-gate\/fixture-/);
    const file = result.outputs.diagnosticLogging.file;
    assert.notEqual(file, null);
    if (file === null) throw new Error("enabled Gate logging must expose its file");
    assert.equal(existsSync(join(repositoryRoot, file)), true);
    assert.match(readFileSync(join(repositoryRoot, file), "utf8"), /invocation/);
  } finally {
    rmSync(invocationLogDirectory, { force: true, recursive: true });
  }
});
