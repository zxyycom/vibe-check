import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isRecord } from "../../data-boundary/value-shapes.ts";
import { executeValidatedRun } from "../invocation.ts";
import {
  capturedProgressWriter,
  check,
  definition,
  DIAGNOSTIC_FILE,
  PASSED
} from "./invocation.test-support.ts";

describe("Package Run output failure composition", () => {
  it("continues output publication after a progress writer failure", async () => {
    const output = capturedProgressWriter({ throws: true });
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-output-"));
    try {
      const result = await executeValidatedRun(
        definition([check()], true),
        {
          outputs: {
            machinePublication: { directory: "published", enabled: true },
            diagnosticLogging: { directory: "diagnostic", enabled: true }
          },
          projectRoot: root
        },
        [],
        {
          progressWriterFactory: () => output.writer,
          wallClock: { now: () => new Date("2026-08-30T12:34:56.789Z") }
        }
      );

      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.equal(result.outputs.machinePublication.status, "succeeded");
      assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
      assert.match(result.outputs.diagnosticLogging.channels.core.file ?? "", DIAGNOSTIC_FILE);
      assert.match(
        result.outputs.diagnosticLogging.channels.core.file ?? "",
        /^diagnostic\/core-20260830T123456\.789Z-/
      );
      assertProgressFailureArtifacts(root, result.outputs.diagnosticLogging.channels.core.file);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("returns output facts when machine publication alone fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-machine-failure-"));
    try {
      writeFileSync(join(root, "blocked"), "not a directory");
      const result = await executeValidatedRun(
        definition([check()], false),
        {
          projectRoot: root,
          outputs: { machinePublication: { directory: "blocked", enabled: true } }
        },
        []
      );
      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "machine-publication-failed" });
      assert.equal(result.outputs.machinePublication.status, "failed");
      assert.equal(result.outputs.progressRendering.status, "disabled");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps both failed outputs and prioritizes progress rendering", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-output-failure-"));
    const output = capturedProgressWriter({ throws: true });
    try {
      writeFileSync(join(root, "blocked"), "not a directory");
      const result = await executeValidatedRun(
        definition([check()], true),
        {
          projectRoot: root,
          outputs: {
            machinePublication: { directory: "blocked", enabled: true },
            diagnosticLogging: { directory: "blocked", enabled: true }
          }
        },
        [],
        { progressWriterFactory: () => output.writer }
      );
      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.equal(result.outputs.machinePublication.status, "failed");
      assert.equal(result.outputs.diagnosticLogging.status, "failed");
      assert.match(result.outputs.diagnosticLogging.channels.core.file ?? "", DIAGNOSTIC_FILE);
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function assertProgressFailureArtifacts(root: string, diagnosticFile: string | null): void {
  assert.equal(existsSync(join(root, diagnosticFile ?? "")), true);
  const diagnosticLog = readFileSync(join(root, diagnosticFile ?? ""), "utf8");
  assert.match(
    diagnosticLog,
    /^#000001 \+\d{2}:\d{2}:\d{2}\.\d{3} \[RUN\] \[STARTED\](?: invocationId="[^"]+")? run\.started /
  );
  assert.match(
    diagnosticLog,
    /\[RUN\] \[PLANNING\] \[SUCCEEDED\](?: invocationId="[^"]+")? run\.planning\.succeeded/
  );
  assert.match(
    diagnosticLog,
    /\[RUN\] \[AGGREGATION\] \[COMPLETED\](?: invocationId="[^"]+")? run\.aggregation\.completed/
  );
  assert.match(
    diagnosticLog,
    /\[RUN\] \[TERMINAL\] \[OUTPUT\](?: invocationId="[^"]+")? run\.terminal-before-log-close/
  );
  assert.match(diagnosticLog, /diagnosticLogging="close-not-yet-confirmed"/);
  assert.doesNotMatch(diagnosticLog, /"diagnosticLogging":\{"enabled":true,"status":"not-run"\}/);
  assert.match(diagnosticLog, /outputs\.machinePublication\.enabled=true/);
  assert.match(diagnosticLog, /outputs\.machinePublication\.status="succeeded"/);
  assert.match(diagnosticLog, /outputs\.progressRendering\.enabled=true/);
  assert.match(diagnosticLog, /outputs\.progressRendering\.status="failed"/);
  assert.equal(diagnosticLog.endsWith("\n"), true);
  assert.equal(existsSync(join(root, "published", "run.json")), true);
  assert.equal(existsSync(join(root, "published", "records.ndjson")), true);
  const publishedRun: unknown = JSON.parse(
    readFileSync(join(root, "published", "run.json"), "utf8")
  );
  assert.equal(
    isRecord(publishedRun)
      ? isRecord(publishedRun.invocation) && publishedRun.invocation.timestamp
      : undefined,
    "2026-08-30T12:34:56.789Z"
  );
}
