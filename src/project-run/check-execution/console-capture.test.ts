import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Check } from "../../check/check.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import { executeValidatedRun } from "../invocation.ts";
import { capturedProgressWriter, deferred } from "../progress-rendering/invocation.test-support.ts";
import { visibleTerminalScreen } from "../progress-rendering/renderer.test-support.ts";

describe("Package Run Check console capture", () => {
  it("attributes concurrent console calls and presents them only after Check settlement", async () => {
    const releaseFirst = deferred<void>();
    const output = capturedProgressWriter({ isTTY: true });
    const originalLog = console.log;
    const result = await executeValidatedRun(
      consoleDefinition([
        {
          checkId: "first",
          displayName: "First",
          async execution() {
            console.log("first started");
            await releaseFirst.promise;
            console.warn("first settled");
            return { status: "passed", data: {} };
          }
        },
        {
          checkId: "second",
          displayName: "Second",
          execution() {
            console.error("second settled");
            releaseFirst.resolve();
            return { status: "passed", data: {} };
          }
        }
      ]),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(console.log, originalLog);
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.deepEqual(result.checkMessages, [
      {
        checkId: "first",
        code: "console-log",
        level: "info",
        message: "first started"
      },
      {
        checkId: "first",
        code: "console-warn",
        level: "warning",
        message: "first settled"
      },
      {
        checkId: "second",
        code: "console-error",
        level: "error",
        message: "second settled"
      }
    ]);
    const visible = visibleTerminalScreen(output.writes);
    assert.equal(
      visible.some((line) => line.includes("| running")),
      false
    );
    assert.equal(visible.filter((line) => line.includes("first started")).length, 1);
    assert.equal(visible.filter((line) => line.includes("first settled")).length, 1);
    assert.equal(visible.filter((line) => line.includes("second settled")).length, 1);

    const progressDisabled = await executeValidatedRun(
      consoleDefinition(
        [
          {
            checkId: "disabled-progress",
            displayName: "Disabled progress",
            execution() {
              console.log("retained without progress");
              return { status: "passed", data: {} };
            }
          }
        ],
        false
      ),
      {},
      []
    );
    assert.equal(progressDisabled.kind, "completed");
    if (progressDisabled.kind === "completed") {
      assert.deepEqual(progressDisabled.checkMessages, [
        {
          checkId: "disabled-progress",
          code: "console-log",
          level: "info",
          message: "retained without progress"
        }
      ]);
    }
  });

  it("retains preflight and execution console calls when the author callback throws", async () => {
    const output = capturedProgressWriter();
    const originalLog = console.log;
    const routedLogMethods: Array<typeof console.log> = [];
    const result = await executeValidatedRun(
      consoleDefinition([
        {
          checkId: "throwing",
          displayName: "Throwing",
          options: { ready: true },
          preflight(options) {
            routedLogMethods.push(console.log);
            console.info("preflight ready", Reflect.get(options, "ready"));
            return {
              status: "success",
              preparedOptions: options,
              messages: [{ code: "prepared", level: "info", message: "Prepared" }]
            };
          },
          execution() {
            routedLogMethods.push(console.log);
            console.group("execution detail");
            console.log({ attempt: 1 });
            console.groupEnd();
            console.error("before throw\u001B[2J");
            throw new Error("callback failed");
          }
        }
      ]),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(routedLogMethods.length, 2);
    assert.equal(routedLogMethods[0], routedLogMethods[1]);
    assert.notEqual(routedLogMethods[0], originalLog);
    assert.equal(console.log, originalLog);
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "execution-threw" }
    });
    assert.deepEqual(result.checkMessages, [
      {
        checkId: "throwing",
        code: "console-info",
        level: "info",
        message: "preflight ready true"
      },
      { checkId: "throwing", code: "prepared", level: "info", message: "Prepared" },
      {
        checkId: "throwing",
        code: "console-group",
        level: "info",
        message: "execution detail"
      },
      {
        checkId: "throwing",
        code: "console-log",
        level: "info",
        message: "  { attempt: 1 }"
      },
      {
        checkId: "throwing",
        code: "console-error",
        level: "error",
        message: "before throw\u001B[2J"
      }
    ]);
    const rendered = output.writes.join("");
    assert.match(rendered, /before throw\\u001B\[2J/);
    assert.equal(rendered.includes("\u001B[2J"), false);
  });
});

function consoleDefinition(checks: readonly Check[], progress = true) {
  return defineConfig({
    checks,
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: progress }
    },
    scheduler: { maxParallel: 2 }
  });
}
