import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { commandCheck } from "./command-check.ts";
import { createCommandCheckFixture } from "./command-check.test-support.ts";

describe("commandCheck authoring", () => {
  it("closes command input, freezes defaults, and preserves ordinary Check composition", async () => {
    const child = createCommandCheckFixture({ checkId: "child", displayName: "Child" });
    const command = createCommandCheckFixture({
      admissionPriority: 3,
      arguments: ["--eval", "process.exit(0)"],
      checks: [child],
      dependsOn: ["base"],
      enabledByFlags: { when: "selected" },
      maxParallel: 2,
      mutex: ["node"],
      observes: ["audit"],
      omitQuietPassedRow: true,
      resourceClaims: { node: 1 }
    });
    assert.equal(command.checkId, "command-test");
    assert.equal(Object.isFrozen(command.options), true);
    assert.deepEqual(command.options.environment, { mode: "exact", variables: {} });
    assert.deepEqual(command.options.output, { mode: "discard" });
    assert.deepEqual(command.options.arguments, ["--eval", "process.exit(0)"]);
    assert.deepEqual(command.dependsOn, ["base"]);
    assert.deepEqual(command.observes, ["audit"]);
    assert.equal(command.admissionPriority, 3);
    assert.equal(command.maxParallel, 2);
    assert.equal(command.omitQuietPassedRow, true);
    assert.equal(command.checks?.[0], child);

    for (const invalidOptions of [
      { ...command.options, executable: "bad\0command" },
      { ...command.options, arguments: ["ok", "bad\0argument"] },
      { ...command.options, environment: { mode: "exact", variables: { KEY: null } } },
      { ...command.options, output: { mode: "unknown" } },
      { ...command.options, timeoutMs: 0 },
      { ...command.options, outputByteLimit: 1.5 },
      { ...command.options, workingDirectory: "bad\0directory" }
    ]) {
      const prepared: unknown = await Reflect.apply(command.prepare!, undefined, [
        invalidOptions,
        new AbortController().signal
      ]);
      assert.deepEqual(prepared, {
        status: "failure",
        action: "block",
        reason: { code: "invalid-options" }
      });
    }

    const sparseArguments = new Array<string>(3);
    sparseArguments[0] = "ok";
    sparseArguments[2] = "later";
    for (const invalidInput of [
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        timeoutMs: 1,
        outputByteLimit: 1,
        unknown: true
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        arguments: sparseArguments,
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "exact" },
        resolveEnvironment: () => ({ mode: "exact" }),
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        afterCommand: { execute: "not-a-function" },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "exact", variables: { "bad\0name": "value" } },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "exact", variables: null },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "exact", variables: undefined },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "inherit", overrides: null },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "inherit", overrides: undefined },
        timeoutMs: 1,
        outputByteLimit: 1
      }
    ]) {
      assert.throws(
        () => Reflect.apply(commandCheck, undefined, [invalidInput]),
        /documented closed command/
      );
    }
  });
});
