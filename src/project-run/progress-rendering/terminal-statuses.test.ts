import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check } from "../../check/check.ts";
import { capturedProgressWriter } from "./invocation.test-support.ts";
import { executeValidatedRun } from "../invocation/run.ts";

function check(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName?: string;
    readonly dependsOn?: Check["dependsOn"];
    readonly enabledByFlags?: Check["enabledByFlags"];
    readonly execute: NonNullable<Check["execute"]>;
    readonly observes?: Check["observes"];
  }>
): Check {
  return {
    checkId: input.checkId,
    displayName: input.displayName ?? input.checkId,
    ...(input.dependsOn === undefined ? {} : { dependsOn: input.dependsOn }),
    ...(input.enabledByFlags === undefined ? {} : { enabledByFlags: input.enabledByFlags }),
    execute: input.execute,
    ...(input.observes === undefined ? {} : { observes: input.observes })
  };
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
  it("bounds flag-disabled Check names before execute while preserving their terminal facts", async () => {
    const directory = mkdtempSync(join(tmpdir(), "vibe-check-flag-preview-"));
    let disabledCalls = 0;
    const flaggedChecks = [
      { checkId: "z-deep-audit", displayName: "Deep audit", flag: "deep-audit" },
      { checkId: "a-dependency-audit", displayName: "Dependency audit", flag: "dependency-audit" }
    ].map(({ checkId, displayName, flag }) =>
      check({
        checkId,
        displayName,
        enabledByFlags: { when: flag },
        execute: () => {
          disabledCalls += 1;
          return { status: "passed", data: {} };
        }
      })
    );
    const summary = "  2 checks not selected: flag conditions not matched.\n";
    const partial =
      summary +
      "    - Deep audit\n    1 additional check name(s) were omitted from terminal preview.\n";
    try {
      for (const { definitionLimit, override, expected } of [
        { definitionLimit: undefined, override: undefined, expected: summary },
        { definitionLimit: 1, override: undefined, expected: partial },
        { definitionLimit: 2, override: 0, expected: summary },
        { definitionLimit: 0, override: 1, expected: partial },
        {
          definitionLimit: 0,
          override: 2,
          expected: summary + "    - Deep audit\n    - Dependency audit\n"
        }
      ]) {
        const output = capturedProgressWriter();
        const progressLogFile = join(directory, `progress-${definitionLimit}-${override}.log`);
        let flagGroupAtExecution: string | undefined;
        const configured = defineConfig({
          checks: [
            ...flaggedChecks,
            check({
              checkId: "always-on",
              displayName: "Always on",
              execute: () => {
                flagGroupAtExecution = output.writes[1];
                return { status: "passed", data: {} };
              }
            })
          ],
          outputs: {
            machinePublication: { enabled: false },
            progressRendering: {
              enabled: true,
              ...(definitionLimit === undefined
                ? {}
                : { flagMismatchPreviewLimit: definitionLimit })
            }
          }
        });
        const result = await executeValidatedRun(
          configured,
          {
            progressLogFile,
            ...(override === undefined
              ? {}
              : {
                  outputs: { progressRendering: { flagMismatchPreviewLimit: override } }
                })
          },
          [],
          { progressWriterFactory: () => output.writer }
        );
        assertFlagDisabledFacts(result);
        assert(result.kind === "completed");
        assert.equal(result.aggregate, "passed");
        assert.deepEqual(
          result.checkDurations.filter(({ durationMs }) => durationMs === null),
          [
            { checkId: "a-dependency-audit", durationMs: null },
            { checkId: "z-deep-audit", durationMs: null }
          ]
        );
        assert.equal(flagGroupAtExecution, expected);
        assert.equal(output.writes[1], expected);
        assert.match(
          output.writes[2] ?? "",
          /^ {2}\[3\/3] Always on \| passed \| \d+(?:\.\d+)?(?:ms|s)\n$/
        );
        assert.equal(output.writes.at(-1)?.includes("not applicable: 2"), true);
        assert.equal(readFileSync(progressLogFile, "utf8"), output.writes.join(""));
      }
      assert.equal(disabledCalls, 0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("groups only flag-disabled Checks outside an activated dependency closure", async () => {
    const output = capturedProgressWriter();
    let deferredCalls = 0;
    let providerCalls = 0;
    let rootCalls = 0;
    const result = await executeValidatedRun(
      progressDefinition([
        check({
          checkId: "provider",
          displayName: "Provider",
          enabledByFlags: { when: "provider" },
          execute: () => {
            providerCalls += 1;
            return { status: "passed", data: {} };
          }
        }),
        check({
          checkId: "root",
          displayName: "Root",
          dependsOn: ["provider"],
          enabledByFlags: { when: "root", propagateDependsOn: true },
          execute: () => {
            rootCalls += 1;
            return { status: "passed", data: {} };
          }
        }),
        check({
          checkId: "deferred",
          displayName: "Deferred",
          enabledByFlags: { when: "deferred" },
          execute: () => {
            deferredCalls += 1;
            return { status: "passed", data: {} };
          }
        })
      ]),
      { flags: ["root"], outputs: { progressRendering: { flagMismatchPreviewLimit: 1 } } },
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "completed");
    assert.deepEqual(
      { deferredCalls, providerCalls, rootCalls },
      {
        deferredCalls: 0,
        providerCalls: 1,
        rootCalls: 1
      }
    );
    assert.equal(
      output.writes[1],
      "  1 check not selected: flag condition not matched.\n    - Deferred\n"
    );
    assert.match(output.writes[2] ?? "", /^ {2}\[2\/3] Provider \| passed \| /);
    assert.match(output.writes[3] ?? "", /^ {2}\[3\/3] Root \| passed \| /);
  });

  it("renders a duration-bearing row for an executed not-applicable Check without a reason", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(
      progressDefinition([
        check({
          checkId: "not-applicable",
          execute: () => ({ status: "not-applicable" })
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
          execute: () => ({ status: "unavailable", reason: { code: "source-unavailable" } })
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
            execute: () => {
              controller.abort();
              return { status: "passed", data: {} };
            }
          }),
          check({
            checkId: "unstarted",
            execute: () => {
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

    assert(result.kind === "cancelled");
    assert(result.phase === "execution");
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
