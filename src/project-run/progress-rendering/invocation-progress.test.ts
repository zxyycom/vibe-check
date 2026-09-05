import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation/run.ts";
import { capturedProgressWriter, check, definition, PASSED } from "./invocation.test-support.ts";

describe("Package Run progress rendering outputs", () => {
  it("presents enabled Package Run progress through the injected plain writer", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(definition([check()], true), {}, [], {
      progressWriterFactory: () => output.writer
    });

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.progressRendering.status, "succeeded");
    assert.equal(output.writes[0], "Vibe Check\ntotal 1 checks\n\nChecks:\n");
    assert.match(output.writes[1] ?? "", /^ {2}\[1\/1] Custom \| passed \| \d+(?:\.\d+)?ms\n$/);
    assert.match(
      output.writes[2] ?? "",
      /^\nExecution summary:\n {2}execution: completed\n {2}total checks: 1\n {2}passed: 1\n {2}failed: 0\n {2}not applicable: 0\n {2}unavailable: 0\n {2}elapsed: \d+(?:\.\d+)?(?:ms|s)\n$/
    );
    assert.equal(output.writes.join("").includes("check durations:"), false);
  });

  it("tees final progress while retaining canonical Check durations in RunResult", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-log-"));
    try {
      const output = capturedProgressWriter();
      const result = await executeValidatedRun(
        definition(
          [
            check({ checkId: "executed" }),
            check({
              checkId: "not-run",
              enabledByFlags: { flags: ["selected"], mode: "all" }
            })
          ],
          true
        ),
        { progressLogFile: "evidence/progress.log", projectRoot: root },
        [],
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.outputs.progressRendering.status, "succeeded");
      assert.equal(result.checkDurations[0]?.checkId, "executed");
      assert.equal(typeof result.checkDurations[0]?.durationMs, "number");
      assert.deepEqual(result.checkDurations[1], { checkId: "not-run", durationMs: null });
      const progressFile = join(root, "evidence", "progress.log");
      assert.equal(existsSync(progressFile), true);
      const transcript = readFileSync(progressFile, "utf8");
      assert.equal(transcript, output.writes.join(""));
      assert.match(transcript, / {2}\[2\/2] executed \| passed \| \d+(?:\.\d+)?(?:ms|s)\n/);
      assert.equal(transcript.includes("check durations:"), false);
      assert.equal(transcript.includes("- not-run: null"), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("keeps terminal progress when its selected file target cannot be opened", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-log-failure-"));
    try {
      writeFileSync(join(root, "not-a-directory"), "file", "utf8");
      const output = capturedProgressWriter();
      const result = await executeValidatedRun(
        definition([check()], true),
        { progressLogFile: "not-a-directory/progress.log", projectRoot: root },
        [],
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
      assert.ok(output.writes.some((write) => write.includes("Execution summary:")));
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
