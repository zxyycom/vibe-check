import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { resolveBaselineCommitSha } from "./revisions.ts";

describe("explicit baseline revision resolution", () => {
  it("canonicalizes commit aliases to one full commit object ID", () => {
    const repository = createRepository();

    try {
      const commitSha = git(repository, ["rev-parse", "HEAD"]);
      assert.match(commitSha, /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u);
      git(repository, ["branch", "baseline-branch", commitSha]);
      git(repository, ["tag", "-a", "baseline-tag", "-m", "baseline", commitSha]);

      for (const revision of ["baseline-branch", "baseline-tag", commitSha.slice(0, 12)]) {
        assert.deepEqual(
          resolveBaselineCommitSha({ cwd: repository, revision }),
          { commitSha, ok: true },
          revision
        );
      }
    } finally {
      rmSync(repository, { force: true, recursive: true });
    }
  });

  it("rejects missing, non-commit, and option-like revisions", () => {
    const repository = createRepository();

    try {
      const cases = ["missing-baseline", "HEAD^{tree}", "--verify"];
      for (const revision of cases) {
        const result = resolveBaselineCommitSha({ cwd: repository, revision });

        assert.equal(result.ok, false, revision);
        if (!result.ok) {
          assert.match(result.error, /locally available commit/i, revision);
        }
      }
    } finally {
      rmSync(repository, { force: true, recursive: true });
    }
  });

  it("keeps Git execution failures as runtime errors", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-baseline-runtime-"));

    try {
      let thrown: unknown;
      try {
        resolveBaselineCommitSha({
          cwd: join(tempRoot, "missing-project-root"),
          revision: "HEAD"
        });
      } catch (error: unknown) {
        thrown = error;
      }

      assert.ok(thrown instanceof Error);
      assert.match(thrown.message, /Git could not run/i);
      assert.equal("code" in thrown, false);
      assert.ok(thrown.cause instanceof Error);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});

function createRepository(): string {
  const repository = mkdtempSync(join(tmpdir(), "vibe-check-baseline-revision-"));
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "quality-test@example.invalid"]);
  git(repository, ["config", "user.name", "Quality Test"]);
  writeFileSync(join(repository, "input.ts"), "export const input = true;\n", "utf8");
  git(repository, ["add", "input.ts"]);
  git(repository, ["commit", "--quiet", "-m", "baseline fixture"]);
  return repository;
}

function git(repository: string, args: readonly string[]): string {
  const result = spawnSync("git", [...args], {
    cwd: repository,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout.trim();
}
