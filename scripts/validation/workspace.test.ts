import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runDocsValidationCli } from "./documentation/workflow.ts";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const entrypoint = resolve(moduleDirectory, "workspace.ts");
const workspaceRoot = resolve(moduleDirectory, "..", "..");

test("root validate CLI runs every docs task by default", () => {
  const result = runValidate("docs");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /json syntax ok:/);
  assert.match(result.stdout, /current machine artifact examples ok: 1 set\(s\)/);
  assert.match(result.stdout, /schema strict compile ok:/);
  assert.match(result.stdout, /report examples ok:/);
  assert.match(result.stdout, /markdown links ok:/);
});

test("root validate CLI forwards focused docs selections", async () => {
  const result = runValidate("docs", "json");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /json syntax ok:/);
  assert.doesNotMatch(
    result.stdout,
    /current machine artifact examples ok:|schema strict compile ok:|report examples ok:|markdown links ok:/
  );

  const documentationRoot = mkdtempSync(join(tmpdir(), "vibe-check-docs-cli-failure-"));
  try {
    mkdirSync(join(documentationRoot, "docs"), { recursive: true });
    writeFileSync(join(documentationRoot, "AGENTS.md"), "# Fixture\n", "utf8");
    writeFileSync(
      join(documentationRoot, "docs", "broken-links.md"),
      "[first](missing-first.md)\n[second](missing-second.md)\n",
      "utf8"
    );

    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runDocsValidationCli({
      argv: ["links"],
      linkRepositoryRoot: documentationRoot,
      writeStderr: (message) => stderr.push(message),
      writeStdout: (message) => stdout.push(message)
    });
    assert.equal(exitCode, 1);
    assert.deepEqual(stdout, []);
    assert.equal(
      stderr.join("\n"),
      [
        "docs/broken-links.md:1:1 missing local Markdown link target: docs/missing-first.md.",
        "docs/broken-links.md:2:1 missing local Markdown link target: docs/missing-second.md."
      ].join("\n")
    );
  } finally {
    rmSync(documentationRoot, { force: true, recursive: true });
  }
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
