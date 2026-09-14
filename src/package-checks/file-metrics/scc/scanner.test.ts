import { strict as assert } from "node:assert";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { estimateSccCommandLineCodeUnits, planSccBatches } from "./batch-planner.ts";
import {
  beginSccLogicalScanResources,
  consumeSccProcessOutput,
  remainingSccBatchMaxBuffer,
  remainingSccBatchTimeoutMs
} from "./logical-scan-resources.ts";
import { scanWithScc } from "./scanner.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCC_FIXED_ARGUMENTS = ["--no-config", "--by-file", "--format", "csv"];

describe("quality scc exact input projection", () => {
  it("returns empty metrics without invoking scc when exact inputs are empty", () => {
    const result = scanWithScc({
      cwd: REPO_ROOT,
      includePaths: [],
      scanner: {
        executable: join(REPO_ROOT, `vibe-check-missing-scc-${process.pid}.cmd`)
      }
    });

    assert.deepEqual(result, {
      ok: true,
      measurements: []
    });
  });

  it("sends --no-config and rejects a successful scc invocation that produces no CSV header", () => {
    const scanner = createFakeSccScanner({
      output: "const output = '';"
    });

    try {
      const result = scanWithScc({
        cwd: REPO_ROOT,
        includePaths: ["src"],
        scanner
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result");
        assert.match(result.error, /header/i);
      }
    } finally {
      scanner.cleanup();
    }
  });

  it("plans a conservative UTF-16 argv partition without reordering or overlap", () => {
    assert.equal(estimateSccCommandLineCodeUnits(["scc", "--by-file", "a"]), 35);
    assert.deepEqual(planSccBatches("scc", ["--by-file"], [], 30), { ok: true, batches: [] });
    assert.deepEqual(planSccBatches("scc", ["--by-file"], ["a", "bb"], 37), {
      ok: true,
      batches: [["a"], ["bb"]]
    });
    assert.deepEqual(planSccBatches("scc", ["--by-file"], ["oversized"], 25), {
      ok: false,
      error: 'scc exact path cannot fit command-line ceiling 25: "oversized"'
    });
  });

  it("rejects one infeasible path before starting a measurement process", () => {
    const callsPath = temporaryPath("scc-calls-");
    const scanner = createFakeSccScanner({ callsPath });

    try {
      const result = scanWithScc({
        cwd: REPO_ROOT,
        includePaths: [`infeasible-${"x".repeat(14_000)}.ts`],
        scanner
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "execution");
      assert.deepEqual(readCalls(callsPath), []);
    } finally {
      scanner.cleanup();
    }
  });

  it("uses one compatible process for small input and merges ordered batch-local measurements", () => {
    const callsPath = temporaryPath("scc-calls-");
    const scanner = createFakeSccScanner({ callsPath });
    const paths = ["src/z.ts", "src/a.ts"];

    try {
      const result = scanWithScc({ cwd: REPO_ROOT, includePaths: paths, scanner });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.deepEqual(
          result.measurements.map((measurement) => measurement.payload.path),
          ["src/a.ts", "src/z.ts"]
        );
      }
      assert.deepEqual(readCalls(callsPath), [paths]);
    } finally {
      scanner.cleanup();
    }
  });

  it("merges successful oversized batches into one stable exact result", () => {
    const callsPath = temporaryPath("scc-calls-");
    const scanner = createFakeSccScanner({ callsPath });
    const paths = [longPath("z-path-"), longPath("a-path-")];

    try {
      const result = scanWithScc({ cwd: REPO_ROOT, includePaths: paths, scanner });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.deepEqual(
          result.measurements.map((measurement) => measurement.payload.path),
          [paths[1], paths[0]]
        );
      }
      assert.deepEqual(readCalls(callsPath), [[paths[0]], [paths[1]]]);
    } finally {
      scanner.cleanup();
    }
  });

  it("covers oversized exact input in sequential batches and rejects a batch-local out-of-scope row", () => {
    const callsPath = temporaryPath("scc-calls-");
    const scanner = createFakeSccScanner({
      callsPath,
      output: `
const output = paths[0]?.startsWith('first-')
  ? [header, row('unapproved.ts')].join('\\n') + '\\n'
  : [header, ...paths.map(row)].join('\\n') + '\\n';`
    });
    const paths = [longPath("first-"), longPath("second-")];

    try {
      const result = scanWithScc({ cwd: REPO_ROOT, includePaths: paths, scanner });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result");
        assert.match(result.error, /unapproved input path/);
      }
      assert.deepEqual(readCalls(callsPath), [[paths[0]]]);
    } finally {
      scanner.cleanup();
    }
  });

  it("rejects duplicate rows only after all batch-local validation has completed", () => {
    const callsPath = temporaryPath("scc-calls-");
    const scanner = createFakeSccScanner({ callsPath });
    const duplicatePath = longPath("duplicate-");

    try {
      const result = scanWithScc({
        cwd: REPO_ROOT,
        includePaths: [duplicatePath, duplicatePath],
        scanner
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result");
        assert.match(result.error, /duplicate measurement path/);
      }
      assert.deepEqual(readCalls(callsPath), [[duplicatePath], [duplicatePath]]);
    } finally {
      scanner.cleanup();
    }
  });

  it("fails the complete logical scan when a later process fails", () => {
    const callsPath = temporaryPath("scc-calls-");
    const scanner = createFakeSccScanner({
      callsPath,
      setup: `
if (paths[0]?.startsWith('later-')) {
  process.stderr.write('later batch failed');
  process.exit(8);
}`
    });
    const paths = [longPath("first-"), longPath("later-")];

    try {
      const result = scanWithScc({ cwd: REPO_ROOT, includePaths: paths, scanner });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "execution");
        assert.match(result.error, /exit 8: later batch failed/);
      }
      assert.deepEqual(readCalls(callsPath), [[paths[0]], [paths[1]]]);
    } finally {
      scanner.cleanup();
    }
  });

  it("does not start a later batch after the shared monotonic deadline expires", () => {
    const callsPath = temporaryPath("scc-calls-");
    const scanner = createFakeSccScanner({ callsPath });
    const paths = [longPath("first-"), longPath("later-")];
    const originalBigint = process.hrtime.bigint.bind(process.hrtime);
    let clockRead = 0;
    Object.defineProperty(process.hrtime, "bigint", {
      configurable: true,
      value: () => (clockRead++ <= 1 ? 0n : 300_000_000_000n)
    });

    try {
      const result = scanWithScc({ cwd: REPO_ROOT, includePaths: paths, scanner });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "execution");
        assert.match(result.error, /shared timeout/);
      }
      assert.deepEqual(readCalls(callsPath), [[paths[0]]]);
    } finally {
      Object.defineProperty(process.hrtime, "bigint", {
        configurable: true,
        value: originalBigint
      });
      scanner.cleanup();
    }
  });

  it("accounts stdout and stderr cumulatively before a later batch can start", () => {
    const resources = beginSccLogicalScanResources(0n, 300, 8);
    assert.equal(remainingSccBatchTimeoutMs(resources, 100_000_000n), 200);
    assert.equal(remainingSccBatchMaxBuffer(resources), 8);
    assert.equal(consumeSccProcessOutput(resources, "éé", "x"), true);
    assert.equal(remainingSccBatchMaxBuffer(resources), 4);
    assert.equal(consumeSccProcessOutput(resources, "abcd", ""), true);
    assert.equal(remainingSccBatchMaxBuffer(resources), null);
    assert.equal(remainingSccBatchTimeoutMs(resources, 300_000_000n), null);
  });
});

function createFakeSccScanner({
  callsPath,
  output = "const output = [header, ...paths.map(row)].join('\\n') + '\\n';",
  setup = ""
}: {
  readonly callsPath?: string;
  readonly output?: string;
  readonly setup?: string;
}) {
  const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-scc-"));
  const fakeSccPath = join(tempDir, "fake-scc.mjs");

  writeFileSync(
    fakeSccPath,
    `#!/usr/bin/env bun
const received = process.argv.slice(2);
const expectedProtocol = ${JSON.stringify(SCC_FIXED_ARGUMENTS)};
if (JSON.stringify(received.slice(0, 4)) !== JSON.stringify(expectedProtocol)) process.exit(9);
const paths = received.slice(4);
const header = 'Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC';
const row = (path) => \`TypeScript,,\${path},1,1,0,0,0,1,0\`;
${callsPath === undefined ? "" : `appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify(paths) + '\\n');`}
${callsPath === undefined ? "" : "import { appendFileSync } from 'node:fs';"}
${setup}
${output}
process.stdout.write(output);
`,
    "utf8"
  );
  chmodSync(fakeSccPath, 0o755);

  return {
    executable: fakeSccPath,
    cleanup: () => {
      rmSync(tempDir, { recursive: true, force: true });
      if (callsPath !== undefined) rmSync(dirname(callsPath), { recursive: true, force: true });
    }
  };
}

function longPath(prefix: string): string {
  return `${prefix}${"x".repeat(13_700)}.ts`;
}

function temporaryPath(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  const path = join(directory, "calls.jsonl");
  return path;
}

function readCalls(path: string): string[][] {
  return existsSync(path)
    ? readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map(parseCallPaths)
    : [];
}

function parseCallPaths(line: string): string[] {
  const parsed: unknown = JSON.parse(line);
  if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) return parsed;
  throw new Error("fake SCC call log is not a string array");
}
