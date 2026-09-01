import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check } from "../../check/check.ts";
import type { ProgressWriter } from "./renderer.ts";
import { executeValidatedRun } from "../invocation.ts";

function check(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName?: string;
    readonly enabledByFlags?: Check["enabledByFlags"];
    readonly execution: Check["execution"];
  }>
): Check {
  return {
    checkId: input.checkId,
    displayName: input.displayName ?? input.checkId,
    ...(input.enabledByFlags === undefined ? {} : { enabledByFlags: input.enabledByFlags }),
    execution: input.execution
  };
}

function checkDisabledByMissingFlag(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly flag: string;
    readonly onUnexpectedExecution: () => void;
  }>
): Check {
  return check({
    checkId: input.checkId,
    displayName: input.displayName,
    enabledByFlags: { flags: [input.flag], mode: "all" },
    execution: () => {
      input.onUnexpectedExecution();
      return { status: "passed", data: {} };
    }
  });
}

function progressDefinition(checks: readonly Check[], maxParallel?: number) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: true }
    },
    ...(maxParallel === undefined ? {} : { scheduler: { maxParallel } })
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

function assertFlagDisabledFacts(result: Awaited<ReturnType<typeof executeValidatedRun>>): void {
  assert(result.kind === "completed");
  assert.deepEqual(
    result.snapshot.checks
      .filter((settledCheck) => settledCheck.checkId !== "always-on")
      .map((settledCheck) => ({
        checkId: settledCheck.checkId,
        outcome: settledCheck.outcome
      })),
    [
      {
        checkId: "a-dependency-audit",
        outcome: {
          status: "not-applicable",
          reason: { code: "flag-condition-not-matched" }
        }
      },
      {
        checkId: "z-deep-audit",
        outcome: {
          status: "not-applicable",
          reason: { code: "flag-condition-not-matched" }
        }
      }
    ]
  );
}

describe("Package Run progress terminal statuses", () => {
  it("groups flag-disabled Check names before execution while preserving their terminal facts", async () => {
    const output = capturedProgressWriter();
    let disabledCalls = 0;
    const result = await executeValidatedRun(
      progressDefinition([
        checkDisabledByMissingFlag({
          checkId: "z-deep-audit",
          displayName: "Deep audit",
          flag: "deep-audit",
          onUnexpectedExecution: () => {
            disabledCalls += 1;
          }
        }),
        checkDisabledByMissingFlag({
          checkId: "a-dependency-audit",
          displayName: "Dependency audit",
          flag: "dependency-audit",
          onUnexpectedExecution: () => {
            disabledCalls += 1;
          }
        }),
        check({
          checkId: "always-on",
          displayName: "Always on",
          execution: () => ({ status: "passed", data: {} })
        })
      ]),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assertFlagDisabledFacts(result);
    assert.equal(disabledCalls, 0);
    assert.equal(
      output.writes[1],
      "  The following 2 checks did not run because the run flags did not match their conditions:\n" +
        "    - Deep audit\n" +
        "    - Dependency audit\n"
    );
    assert.match(output.writes[2] ?? "", /^ {2}\[3\/3] Always on \| passed \| \d+(?:\.\d+)?ms\n$/);
    assert.equal(output.writes.join("").includes("flag-condition-not-matched"), false);
    assert.equal(output.writes.at(-1)?.includes("not applicable: 2"), true);
  });

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
              return { status: "passed", data: {} };
            }
          }),
          check({
            checkId: "unstarted",
            execution: () => {
              unstartedCalls += 1;
              return { status: "passed", data: {} };
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
