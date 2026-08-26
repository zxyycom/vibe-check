import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const entrypoint = resolve(moduleDirectory, "workflow.ts");
const workspaceRoot = resolve(moduleDirectory, "..", "..", "..");

test("docs validation CLI runs every task by default", () => {
  const result = runDocsValidation();

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /json syntax ok:/);
  assert.match(result.stdout, /schema strict compile ok:/);
  assert.match(result.stdout, /report examples ok:/);
  assert.match(result.stdout, /markdown links ok:/);
});

test("docs validation CLI selects only requested tasks", () => {
  const result = runDocsValidation("json");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /json syntax ok:/);
  assert.doesNotMatch(
    result.stdout,
    /schema strict compile ok:|report examples ok:|markdown links ok:/
  );
});

type CliResult = {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
};

function runDocsValidation(...args: string[]): CliResult {
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  return {
    status: result.status,
    stderr: readProcessOutput(result.stderr),
    stdout: readProcessOutput(result.stdout)
  };
}

function readProcessOutput(value: ReturnType<typeof spawnSync>["stdout"]): string {
  return typeof value === "string" ? value : (value?.toString() ?? "");
}
