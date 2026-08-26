import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check } from "../../check/check.ts";
import type { ProgressWriter } from "./renderer.ts";
import { executeValidatedRun } from "../invocation.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: true }
    }
  });
}

function check(checkId = "custom", execution: Check["execution"] = () => PASSED): Check {
  return { checkId, displayName: "Custom", execution };
}

function failingProgressWriter(): ProgressWriter {
  return {
    color: false,
    isTTY: false,
    term: undefined,
    write: (): void => {
      throw new Error("progress stream closed");
    }
  };
}

function capturedProgressWriter(throwAtWrite: number) {
  const attempts: string[] = [];
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: false,
    isTTY: false,
    term: undefined,
    write: (content: string): void => {
      attempts.push(content);
      if (attempts.length === throwAtWrite) throw new Error("progress stream closed");
      writes.push(content);
    }
  };
  return { attempts, writes, writer };
}

describe("Package Run progress result priority", () => {
  it("keeps an execution failure distinct when progress presentation has failed", async () => {
    let reads = 0;
    const clock = Object.freeze({
      now: (): number => {
        reads += 1;
        if (reads === 1) return 0;
        throw new Error("execution clock failed");
      }
    });
    const result = await executeValidatedRun(definition([check()]), {}, [], {
      clock,
      progressWriterFactory: failingProgressWriter
    });

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "task-engine-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
  });

  it("mutes ordinary progress events after a settled writer failure while preserving final facts", async () => {
    const output = capturedProgressWriter(2);
    const result = await executeValidatedRun(
      definition([
        check("first", () => ({
          status: "passed",
          data: {},
          messages: [{ level: "info", code: "writer-retained", message: "retained message" }]
        })),
        check("second")
      ]),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.equal(output.attempts.length, 2);
    assert.equal(output.attempts[0], "Vibe Check\ntotal 2 checks\n\nChecks:\n");
    assert.match(
      output.attempts[1] ?? "",
      /^ {2}\[1\/2] Custom \| passed \| \d+(?:\.\d+)?(?:ms|s)\n {4}\[info] retained message\n$/
    );
    assert.deepEqual(output.writes, ["Vibe Check\ntotal 2 checks\n\nChecks:\n"]);
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
      [
        { checkId: "first", outcome: PASSED },
        { checkId: "second", outcome: PASSED }
      ]
    );
    assert.deepEqual(result.checkMessages, [
      {
        checkId: "first",
        level: "info",
        code: "writer-retained",
        message: "retained message"
      }
    ]);
  });

  it("keeps execution cancellation distinct when progress presentation has failed", async () => {
    const controller = new AbortController();
    const result = await executeValidatedRun(
      definition([
        {
          checkId: "started",
          displayName: "Started",
          execution: () => {
            controller.abort();
            return PASSED;
          }
        },
        check("unstarted")
      ]),
      { signal: controller.signal },
      [],
      { progressWriterFactory: failingProgressWriter }
    );

    assert.equal(result.kind, "cancelled");
    if (result.kind !== "cancelled" || result.phase !== "execution") return;
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.equal(result.snapshot.checks.length, 2);
  });
});
