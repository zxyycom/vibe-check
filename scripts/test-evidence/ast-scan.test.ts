import assert from "node:assert/strict";
import test from "node:test";

import { scanAstRule } from "./ast-scan.ts";

test("forwards cancellation to ast-grep scans", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;

  const result = await scanAstRule(
    {
      cancelSignal: controller.signal,
      paths: [],
      rulePath: "fixture-rule.yml",
      workspaceRoot: "/fixture"
    },
    async (_args, options) => {
      receivedSignal = options?.cancelSignal;
      return { signal: null, status: 0, stderr: "", stdout: "" };
    }
  );

  assert.strictEqual(receivedSignal, controller.signal);
  assert.deepEqual(result, { diagnostics: [], matches: [] });
});
