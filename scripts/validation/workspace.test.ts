import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const entrypoint = resolve(moduleDirectory, "workspace.ts");
const workspaceRoot = resolve(moduleDirectory, "..", "..");

test("root validate CLI runs every docs task by default", () => {
  const result = runValidate("docs");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /json syntax ok:/);
  assert.match(result.stdout, /current machine artifact examples ok: 4 set\(s\)/);
  assert.match(result.stdout, /schema strict compile ok:/);
  assert.match(result.stdout, /report examples ok:/);
  assert.match(result.stdout, /markdown links ok:/);
});

test("root validate CLI forwards focused docs selections", () => {
  const result = runValidate("docs", "json");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /json syntax ok:/);
  assert.doesNotMatch(
    result.stdout,
    /current machine artifact examples ok:|schema strict compile ok:|report examples ok:|markdown links ok:/
  );
});

type CliResult = {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
};

function runValidate(...args: string[]): CliResult {
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
