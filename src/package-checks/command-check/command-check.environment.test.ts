import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import {
  createCommandCheckExecutionContext,
  createCommandCheckFixture,
  executeCommandCheckFixture
} from "./command-check.test-support.ts";
import type { AfterCommandContext, CommandEnvironmentContext } from "./contract.ts";

const CANARY_OUTPUT = "command-output-canary";

describe("commandCheck environment", () => {
  it("uses no-shell arguments, resolved cwd, and exact or inherited environment without publishing child material", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    const nested = join(root, "nested");
    mkdirSync(nested);
    try {
      const exact = createCommandCheckFixture({
        arguments: [
          "--eval",
          `if (process.cwd() !== ${JSON.stringify(nested)} || process.env.EXACT !== "yes" || process.env.PATH !== undefined) process.exit(7); process.stdout.write(${JSON.stringify(CANARY_OUTPUT)})`
        ],
        environment: { mode: "exact", variables: { EXACT: "yes" } },
        workingDirectory: "nested"
      });
      assert.deepEqual(await executeCommandCheckFixture(exact.options, root), {
        status: "passed",
        data: { exitCode: 0 }
      });

      const inherited = createCommandCheckFixture({
        arguments: [
          "--eval",
          'if (process.env.COMMAND_CHECK_PARENT !== "parent" || process.env.REMOVE !== undefined) process.exit(8)'
        ],
        environment: { mode: "inherit", overrides: { REMOVE: null } }
      });
      process.env.COMMAND_CHECK_PARENT = "parent";
      process.env.REMOVE = "remove";
      try {
        assert.deepEqual(await executeCommandCheckFixture(inherited.options, root), {
          status: "passed",
          data: { exitCode: 0 }
        });
      } finally {
        delete process.env.COMMAND_CHECK_PARENT;
        delete process.env.REMOVE;
      }
      const productSurface = JSON.stringify(await executeCommandCheckFixture(exact.options, root));
      assert.equal(productSurface.includes(CANARY_OUTPUT), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("resolves a closed invocation environment and lets afterCommand own complete numeric-exit settlement", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    let resolverCalls = 0;
    let settled:
      | Readonly<{ readonly exitCode: number; readonly stderr: string; readonly stdout: string }>
      | undefined;
    try {
      const command = createCommandCheckFixture({
        arguments: [
          "--eval",
          'if (process.env.RESOLVED_COMMAND_ENVIRONMENT !== "yes") process.exit(17); process.stdout.write("resolved"); process.exitCode = 13'
        ],
        afterCommand: {
          execute: (callbackContext: AfterCommandContext) => {
            settled = callbackContext.command;
            callbackContext.records.report(
              { id: "command-completion" },
              { exitCode: callbackContext.command.exitCode }
            );
            return { status: "failed", data: { source: "after-command" } };
          }
        },
        resolveEnvironment: (resolverContext: CommandEnvironmentContext) => {
          resolverCalls += 1;
          assert.equal(resolverContext.project.root, root);
          assert.equal(resolverContext.dependencies.list().length, 0);
          assert.equal(resolverContext.signal.aborted, false);
          return { mode: "exact", variables: { RESOLVED_COMMAND_ENVIRONMENT: "yes" } };
        }
      });
      const result = await run(
        defineConfig({
          checks: [command],
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          }
        }),
        { projectRoot: root }
      );
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(resolverCalls, 1);
      assert.deepEqual(settled, { exitCode: 13, stderr: "", stdout: "resolved" });
      const outcome = result.snapshot.checks[0]?.outcome;
      assert.equal(outcome?.status, "failed");
      if (outcome?.status === "failed") assert.equal(outcome.data.source, "after-command");
      const record = result.snapshot.records[0];
      assert.equal(record?.checkId, "command-test");
      assert.equal(record?.id, "command-completion");
      assert.equal(record?.data.exitCode, 13);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("fails closed when the environment resolver throws or returns an invalid policy before spawn", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    const startedPath = join(root, "resolver-should-not-spawn");
    try {
      for (const resolveEnvironment of [
        () => {
          throw new Error("resolver failure");
        },
        () => ({ mode: "unsupported" }),
        () => undefined,
        () => null
      ]) {
        const command = createCommandCheckFixture({
          arguments: [
            "--eval",
            `require("node:fs").writeFileSync(${JSON.stringify(startedPath)}, "started")`
          ],
          resolveEnvironment
        });
        assert.deepEqual(
          await command.execute(createCommandCheckExecutionContext(command.options, root)),
          {
            status: "unavailable",
            reason: { code: "command-environment-resolution-failed" }
          }
        );
        assert.equal(existsSync(startedPath), false);
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
