import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Check } from "../../check/check.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import type { ProgressWriter } from "../../project-run/progress-rendering/renderer.ts";
import { run } from "../../project-run/run.ts";

export const OUTPUTS_DISABLED = Object.freeze({
  machinePublication: Object.freeze({ enabled: false }),
  progressRendering: Object.freeze({ enabled: false })
});

export const FULL_BASE = "a".repeat(40);

export function definition(
  check: Check,
  outputs: Readonly<{
    readonly machinePublication: Readonly<{
      readonly directory?: string;
      readonly enabled: boolean;
    }>;
    readonly progressRendering: Readonly<{ readonly enabled: boolean }>;
  }> = OUTPUTS_DISABLED
) {
  return defineConfig({ checks: [check], outputs });
}

export function git(root: string, args: readonly string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

export function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-maintenance-reminders-"));
  git(root, ["init"]);
  git(root, ["config", "diff.renames", "false"]);
  git(root, ["config", "user.email", "vibe-check@example.test"]);
  git(root, ["config", "user.name", "Vibe Check"]);
  return root;
}

export function commit(root: string, message: string): string {
  git(root, ["add", "--all"]);
  git(root, ["commit", "--no-gpg-sign", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

export function onlyOutcome(result: Awaited<ReturnType<typeof run>>) {
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") throw new Error("Maintenance reminder Run did not complete");
  assert.equal(result.snapshot.checks.length, 1);
  return Object.freeze({ outcome: result.snapshot.checks[0].outcome, result });
}

export function capturedProgressWriter(): Readonly<{
  readonly writes: string[];
  readonly writer: ProgressWriter;
}> {
  const writes: string[] = [];
  return {
    writes,
    writer: {
      color: false,
      isTTY: false,
      term: undefined,
      write: (content: string): void => {
        writes.push(content);
      }
    }
  };
}
