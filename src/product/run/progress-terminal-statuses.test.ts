import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig, type Check } from "../definition/project.ts";
import type { ProgressWriter } from "./progress.ts";
import { executeValidatedRun } from "./invocation.ts";

function check(
  input: Readonly<{
    readonly checkId: string;
    readonly execution: Check["execution"];
  }>
): Check {
  return {
    checkId: input.checkId,
    displayName: input.checkId,
    execution: input.execution,
    recordTypes: []
  };
}

function progressDefinition(checks: readonly Check[], maxParallel?: number) {
  return defineConfig({
    checks,
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: true }
    },
    ...(maxParallel === undefined ? {} : { scheduler: { maxParallel } }),
    selectedPolicy: null
  });
}

function capturedProgressWriter() {
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: false,
    isTTY: false,
    term: undefined,
    write: (content: string): void => {
      writes.push(content);
    }
  };
  return { writes, writer };
}

describe("Package Run progress terminal statuses", () => {
  it("renders a duration-bearing row for an executed not-applicable Check without a reason", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(
      progressDefinition([
        check({
          checkId: "not-applicable",
          execution: () => ({ status: "not-applicable" })
        })
      ]),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "completed");
    assert.match(
      output.writes.find((write) => write.includes("not-applicable")) ?? "",
      /^ {2}\[1\/1] not-applicable \| not-applicable \| \d+(?:\.\d+)?(?:ms|s)\n$/
    );
  });

  it("renders a duration-bearing row for an executed unavailable Check", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(
      progressDefinition([
        check({
          checkId: "unavailable",
          execution: () => ({ status: "unavailable", reason: { code: "source-unavailable" } })
        })
      ]),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "completed");
    assert.match(
      output.writes.find((write) => write.includes("source-unavailable")) ?? "",
      /^ {2}\[1\/1] unavailable \| unavailable \| \d+(?:\.\d+)?(?:ms|s) \| source-unavailable\n$/
    );
  });

  it("renders unstarted cancellation as execution-cancelled and not run", async () => {
    const controller = new AbortController();
    const output = capturedProgressWriter();
    let unstartedCalls = 0;
    const result = await executeValidatedRun(
      progressDefinition(
        [
          check({
            checkId: "started",
            execution: () => {
              controller.abort();
              return { status: "completed", verdict: "passed" };
            }
          }),
          check({
            checkId: "unstarted",
            execution: () => {
              unstartedCalls += 1;
              return { status: "completed", verdict: "passed" };
            }
          })
        ],
        1
      ),
      { signal: controller.signal },
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "cancelled");
    if (result.kind !== "cancelled" || result.phase !== "execution") return;
    assert.equal(unstartedCalls, 0);
    assert.deepEqual(result.snapshot.checks[1]?.outcome, {
      status: "unavailable",
      reason: { code: "execution-cancelled" }
    });
    assert.equal(
      output.writes.includes("  [2/2] unstarted | unavailable | not run | execution-cancelled\n"),
      true
    );
    assert.equal(output.writes.at(-1)?.includes("execution: cancelled"), true);
  });
});
