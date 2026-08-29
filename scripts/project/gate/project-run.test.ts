import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

import { preparePackageCandidate } from "../../package/candidate/prepare.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import { selectionFlags } from "./controls.ts";
import { projectGateOutputOverrides } from "./project-run.ts";

const repositoryRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const qualityCheckIds = [
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "markdown-link-validation"
] as const;

// Keep the test-name literal on its registration line so Test Evidence locations agree.
// prettier-ignore
it("binds the Product diagnostic log and standard machine facts to the Gate invocation directory", { timeout: 20_000 }, async () => {
  const ordinaryDiagnosticDirectory = join(repositoryRoot, ".log", "project-run");
  const ordinaryDiagnosticFilesBefore = diagnosticFileInventory(ordinaryDiagnosticDirectory);
  const invocationLogRoot = join(repositoryRoot, ".log", "project-gate");
  mkdirSync(invocationLogRoot, { recursive: true });
  const invocationLogDirectory = mkdtempSync(join(invocationLogRoot, "fixture-"));
  try {
    const preparedCandidate = await preparePackageCandidate();
    const { runProjectGate } = await import("./project-run.ts");

    const result = await runProjectGate({
      flags: selectionFlags({
        disabledTags: [
          "catalog",
          "docs",
          "format",
          "git",
          "package-tests",
          "product",
          "scripts",
          "tests"
        ],
        enabledTags: [],
        profile: "required"
      }),
      invocationLogDirectory,
      preparedCandidate
    });

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.diagnosticLogging.enabled, true);
    assert.equal(result.outputs.machinePublication.enabled, true);
    assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
    assert.match(result.outputs.diagnosticLogging.file ?? "", /^\.log\/project-gate\/fixture-/);
    const file = result.outputs.diagnosticLogging.file;
    assert.notEqual(file, null);
    if (file === null) throw new Error("enabled Gate logging must expose its file");
    const diagnosticFile = join(repositoryRoot, file);
    assert.equal(existsSync(diagnosticFile), true);
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
    assert.equal(result.outputs.machinePublication.status, "succeeded");
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
    const qualityFacts = publishedRun.checks.filter(
      (check): check is Record<string, unknown> =>
        isNonArrayRecord(check) &&
        qualityCheckIds.some((qualityCheckId) => qualityCheckId === check.checkId)
    );
    assert.deepEqual(
      qualityFacts.map(({ checkId }) => checkId),
      qualityCheckIds
    );
    for (const qualityFact of qualityFacts) {
      const outcome = qualityFact.outcome;
      assert.equal(isNonArrayRecord(outcome), true);
      if (!isNonArrayRecord(outcome)) throw new Error("Quality Check outcome must be an object");
      const reasonCode =
        outcome.status === "not-applicable" && isNonArrayRecord(outcome.reason)
          ? outcome.reason.code
          : undefined;
      assert.notEqual(reasonCode, "tag-quality-disabled");
    }
    const recordLines = readFileSync(join(invocationLogDirectory, "records.ndjson"), "utf8");
    if (recordLines.length > 0) {
      for (const recordLine of recordLines.trimEnd().split("\n")) {
        const record: unknown = JSON.parse(recordLine);
        assert.equal(isNonArrayRecord(record), true);
        if (!isNonArrayRecord(record)) throw new Error("Gate Record must be an object");
        assert.equal(
          qualityCheckIds.some((qualityCheckId) => qualityCheckId === record.checkId),
          true
        );
      }
    }
    assert.deepEqual(diagnosticFileInventory(invocationLogDirectory), [
      "records.ndjson",
      relative(invocationLogDirectory, diagnosticFile),
      "run.json"
    ]);
    assert.deepEqual(
      diagnosticFileInventory(ordinaryDiagnosticDirectory),
      ordinaryDiagnosticFilesBefore
    );
  } finally {
    rmSync(invocationLogDirectory, { force: true, recursive: true });
    assert.equal(existsSync(invocationLogDirectory), false);
    assert.deepEqual(
      diagnosticFileInventory(ordinaryDiagnosticDirectory),
      ordinaryDiagnosticFilesBefore
    );
  }
});

function diagnosticFileInventory(directory: string): readonly string[] {
  if (!existsSync(directory)) return [];
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
