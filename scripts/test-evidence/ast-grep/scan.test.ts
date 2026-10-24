import assert from "node:assert/strict";
import test from "node:test";

import type { ProcessResult } from "../../process-execution/execution.ts";
import { scanAstRules, type AstMatch } from "./scan.ts";

const scanOptions = {
  configPath: "fixture/sgconfig.yml",
  paths: ["src/first.test.ts", "scripts/second.test.ts"],
  workspaceRoot: "/fixture"
};
const match: AstMatch = {
  file: "src/first.test.ts",
  text: 'test("literal", () => {})',
  ruleId: "bun-native-test",
  range: { start: { line: 2, column: 0 }, end: { line: 2, column: 25 } },
  metaVariables: {
    single: {
      NAME: {
        text: "literal",
        range: { start: { line: 2, column: 6 }, end: { line: 2, column: 13 } }
      }
    }
  }
};
const successfulProcess: ProcessResult = {
  signal: null,
  status: 0,
  stderr: "",
  stdout: JSON.stringify(match)
};

test("scans all configured rules once and forwards paths and cancellation", async () => {
  const controller = new AbortController();
  const invocations: unknown[] = [];
  let receivedSignal: AbortSignal | undefined;
  const result = await scanAstRules(
    { ...scanOptions, cancelSignal: controller.signal },
    async (args, options) => {
      invocations.push({ args, options });
      receivedSignal = options?.cancelSignal;
      return successfulProcess;
    }
  );

  assert.strictEqual(receivedSignal, controller.signal);
  assert.deepEqual(invocations, [
    {
      args: [
        "scan",
        "--config",
        "fixture/sgconfig.yml",
        "--json=stream",
        "--color",
        "never",
        "src/first.test.ts",
        "scripts/second.test.ts"
      ],
      options: { cancelSignal: controller.signal, workspaceRoot: "/fixture" }
    }
  ]);
  assert.deepEqual(result, { diagnostics: [], matches: [match] });
});

test("accepts complete configured match streams and empty scans", async () => {
  const matches: AstMatch[] = [
    match,
    { ...match, range: { start: { line: 2, column: 5 }, end: { line: 3, column: 1 } } },
    { ...match, ruleId: "bun-unsupported-alias" },
    { ...match, ruleId: "bun-unsupported-dynamic" },
    { ...match, ruleId: "bun-unsupported-parameterized" }
  ];
  for (const status of [0, 1]) {
    const result = await scanAstRules(scanOptions, async () => ({
      ...successfulProcess,
      status,
      stdout: `\r\n${matches.map((candidate) => JSON.stringify(candidate)).join("\r\n")}\r\n`
    }));
    assert.deepEqual(result, { diagnostics: [], matches });
    const empty = await scanAstRules(scanOptions, async () => ({
      ...successfulProcess,
      status,
      stdout: " \r\n\n"
    }));
    assert.deepEqual(empty, { diagnostics: [], matches: [] });
  }
});

test("rejects failed ast-grep processes without partial matches", async () => {
  const failures: { result: ProcessResult; message: RegExp }[] = [
    {
      result: { ...successfulProcess, status: 2, stderr: "invalid config" },
      message: /invalid config/
    },
    { result: { ...successfulProcess, status: null, signal: "SIGTERM" }, message: /SIGTERM/ },
    { result: { ...successfulProcess, status: null }, message: /status null/ },
    { result: { ...successfulProcess, error: new Error("spawn failed") }, message: /spawn failed/ },
    { result: { ...successfulProcess, timedOut: true }, message: /timed out/ }
  ];
  for (const failure of failures) {
    const result = await scanAstRules(scanOptions, async () => failure.result);
    assertScanFailure(result, failure.message);
  }
  const thrown = await scanAstRules(scanOptions, async () => {
    throw new Error("executable missing");
  });
  assertScanFailure(thrown, /executable missing/);
});

test("rejects malformed or unknown ast-grep matches without partial results", async () => {
  const malformedOutputs = [
    "not JSON",
    "null",
    "[]",
    JSON.stringify({ ...match, ruleId: "unexpected-rule" }),
    JSON.stringify({ ...match, ruleId: undefined }),
    JSON.stringify({ ...match, range: { start: { line: -1, column: 0 }, end: match.range.end } }),
    JSON.stringify({ ...match, range: { start: match.range.start, end: { line: 1, column: 25 } } }),
    JSON.stringify({ ...match, range: { start: { line: 2, column: 26 }, end: match.range.end } }),
    JSON.stringify({ ...match, metaVariables: {} }),
    JSON.stringify({
      ...match,
      metaVariables: {
        single: {
          NAME: {
            text: "literal",
            range: { start: { line: 2, column: 13 }, end: { line: 2, column: 6 } }
          }
        }
      }
    }),
    JSON.stringify({ ...match, metaVariables: { single: { NAME: { text: "literal" } } } })
  ];
  for (const malformed of malformedOutputs) {
    const result = await scanAstRules(scanOptions, async () => ({
      ...successfulProcess,
      stdout: `${JSON.stringify(match)}\n${malformed}\n`
    }));
    assertScanFailure(result, /sgconfig.yml returned malformed output/);
    if (malformed.includes("unexpected-rule")) {
      assert.match(result.diagnostics[0]?.message ?? "", /unknown ast-grep ruleId unexpected-rule/);
    }
  }
});

function assertScanFailure(
  result: Awaited<ReturnType<typeof scanAstRules>>,
  message: RegExp
): void {
  assert.deepEqual(result.matches, []);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0]?.code, "static-scan-failed");
  assert.equal(result.diagnostics[0]?.origin, "static");
  assert.equal(result.diagnostics[0]?.blocking, true);
  assert.match(result.diagnostics[0]?.message ?? "", message);
}
