import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ProcessResult } from "../../../../process-execution/execution.ts";
import { invokeCheckWithRecords } from "../check-execution.test-support.ts";
import {
  createProcessCheckWithFailureProjection,
  type ProcessCheckDependencies,
  type ProcessCheckDescriptor
} from "./process.ts";

const definition: ProcessCheckDescriptor = Object.freeze({
  args: [],
  checkId: "structured-fixture",
  command: process.execPath,
  displayName: "Structured fixture"
});

describe("Project Gate structured process failure projection", () => {
  it("writes settled evidence before publishing complete owner Records", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-structured-process-"));
    const events: string[] = [];
    const secret = "https://user:token@example.test";
    try {
      const check = createProcessCheckWithFailureProjection(
        definition,
        {
          recordsFromStdout: (stdout) => {
            events.push("project");
            assert.equal(stdout, secret);
            return [
              {
                data: { kind: "fixture-diagnostic", path: "src/example.ts" },
                id: "fixture:src%2Fexample.ts"
              }
            ];
          }
        },
        dependencies(events, { signal: null, status: 1, stderr: secret, stdout: secret })
      );
      const artifactDirectory = join(root, "checks", definition.checkId);
      const invocation = await invokeCheckWithRecords(check, undefined, artifactDirectory);

      assert.deepEqual(events, ["startup", "settled", "project"]);
      assert.deepEqual(invocation.records, [
        {
          data: { kind: "fixture-diagnostic", path: "src/example.ts" },
          identity: { id: "fixture:src%2Fexample.ts" }
        }
      ]);
      assert.deepEqual(invocation.result, {
        data: { exitCode: 1 },
        messages: [
          {
            code: "command-failed",
            level: "error",
            message:
              "Command exited with code 1; signal: none; transcript: checks/structured-fixture/process.log."
          }
        ],
        status: "failed"
      });
      assert.match(
        readFileSync(join(artifactDirectory, "process.log"), "utf8"),
        new RegExp(secret)
      );
      const visible = JSON.stringify({ records: invocation.records, result: invocation.result });
      assert.equal(visible.includes(secret), false);
      assert.equal(visible.includes(root), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("falls back once without partial owner Records when projection declines the child output", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-structured-process-"));
    try {
      const check = createProcessCheckWithFailureProjection(
        definition,
        { recordsFromStdout: () => undefined },
        dependencies([], { signal: null, status: 1, stderr: "", stdout: "malformed child output" })
      );
      const invocation = await invokeCheckWithRecords(
        check,
        undefined,
        join(root, "checks", definition.checkId)
      );

      assert.deepEqual(invocation.records, [
        {
          data: {
            command: "bun",
            exitCode: 1,
            log: "checks/structured-fixture/process.log",
            signal: "none"
          },
          identity: { id: "command-failure" }
        }
      ]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("falls back once without partial owner Records when the projection produces duplicate identities", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-structured-process-"));
    try {
      const check = createProcessCheckWithFailureProjection(
        definition,
        {
          recordsFromStdout: () => [
            {
              data: { kind: "fixture-diagnostic", path: "src/a.ts" },
              id: "fixture:duplicate"
            },
            {
              data: { kind: "fixture-diagnostic", path: "src/b.ts" },
              id: "fixture:duplicate"
            }
          ]
        },
        dependencies([], { signal: null, status: 1, stderr: "", stdout: "safe child output" })
      );
      const invocation = await invokeCheckWithRecords(
        check,
        undefined,
        join(root, "checks", definition.checkId)
      );

      assert.deepEqual(invocation.records, [
        {
          data: {
            command: "bun",
            exitCode: 1,
            log: "checks/structured-fixture/process.log",
            signal: "none"
          },
          identity: { id: "command-failure" }
        }
      ]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

function dependencies(events: string[], result: ProcessResult): ProcessCheckDependencies {
  return {
    runProcess: async () => result,
    writeTextFile: ({ content, filePath }) => {
      events.push(content.includes("status: running") ? "startup" : "settled");
      writeFileSync(filePath, content, "utf8");
    }
  };
}
