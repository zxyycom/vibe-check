import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ProjectChangesConfiguration } from "../../project-definition/project-changes.ts";
import { CHANGE_FLAG_PREFIX, GIT_CHANGES_UNAVAILABLE_CODE, prepareProjectChanges } from "./git.ts";
import { commit, git, write } from "./git.test-support.ts";

const changes: ProjectChangesConfiguration = {
  flags: {
    all: { exclude: ["src/generated/**"], include: ["**/*"] },
    docs: { exclude: [], include: ["docs/**/*.md"] },
    source: { exclude: ["src/generated/**"], include: ["src/**/*.ts"] },
    unmatched: { exclude: [], include: ["never/**"] }
  },
  source: { compareWith: "HEAD~1" }
};

describe("Project Run Git changes", () => {
  it("collects every Git delta once, retains rename and deletion paths, and matches frozen regions", () => {
    const repository = repositoryFixture();
    try {
      write(repository, "src/committed.ts", "export const committed = 2;\n");
      rmSync(join(repository, "src/deleted.ts"));
      renameSync(join(repository, "src/renamed-old.ts"), join(repository, "docs/renamed-new.md"));
      write(repository, "src/generated/ignored.ts", "export const ignored = 2;\n");
      commit(repository, "changed committed paths");
      write(repository, "src/staged.ts", "export const staged = true;\n");
      git(repository, ["add", "src/staged.ts"]);
      write(repository, "docs/unstaged.md", "# unstaged\n");
      write(repository, "src/untracked.ts", "export const untracked = true;\n");

      const prepared = prepareProjectChanges({
        callerFlags: ["caller"],
        changes,
        projectRoot: repository
      });

      assert.deepEqual(prepared.effectiveFlags, [
        "caller",
        `${CHANGE_FLAG_PREFIX}all`,
        `${CHANGE_FLAG_PREFIX}docs`,
        `${CHANGE_FLAG_PREFIX}source`
      ]);
      assert.equal(prepared.projectChanges.ok, true);
      if (!prepared.projectChanges.ok) return;
      assert.equal(Object.isFrozen(prepared.projectChanges), true);
      assert.deepEqual(prepared.projectChanges.files, [
        file("docs/renamed-new.md", ["all", "docs"]),
        file("docs/unstaged.md", ["all", "docs"]),
        file("src/committed.ts", ["all", "source"]),
        file("src/deleted.ts", ["all", "source"]),
        file("src/renamed-old.ts", ["all", "source"]),
        file("src/staged.ts", ["all", "source"]),
        file("src/untracked.ts", ["all", "source"])
      ]);
      assert(prepared.projectChanges.files.every((entry) => Object.isFrozen(entry)));
      assert(prepared.projectChanges.files.every((entry) => Object.isFrozen(entry.flags)));

      const baseline = gitText(repository, ["rev-parse", "HEAD"]);
      git(repository, ["branch", "comparison-base", baseline]);
      git(repository, ["tag", "comparison-tag", baseline]);
      for (const compareWith of ["comparison-base", baseline, "HEAD~1", "comparison-tag"]) {
        const revisionPrepared = prepareProjectChanges({
          callerFlags: [],
          changes: {
            flags: { source: { exclude: [], include: ["src/**"] } },
            source: { compareWith }
          },
          projectRoot: repository
        });
        assert.equal(revisionPrepared.projectChanges.ok, true);
      }
    } finally {
      rmSync(repository, { force: true, recursive: true });
    }
  });

  it("keeps unavailable evidence distinct while conservatively enabling every declared flag", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-changes-unavailable-"));
    try {
      const prepared = prepareProjectChanges({
        callerFlags: ["caller"],
        changes,
        projectRoot: root
      });
      assert.deepEqual(prepared.effectiveFlags, [
        "caller",
        `${CHANGE_FLAG_PREFIX}all`,
        `${CHANGE_FLAG_PREFIX}docs`,
        `${CHANGE_FLAG_PREFIX}source`,
        `${CHANGE_FLAG_PREFIX}unmatched`
      ]);
      assert.deepEqual(prepared.projectChanges, {
        ok: false,
        reason: { code: GIT_CHANGES_UNAVAILABLE_CODE }
      });
      assert.equal(Object.isFrozen(prepared.projectChanges), true);
      assert.equal(Object.isFrozen(prepared.projectChanges.reason), true);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("retains a trustworthy zero-match snapshot without deriving a flag", () => {
    const repository = repositoryFixture();
    try {
      write(repository, "docs/changed.md", "# changed\n");
      commit(repository, "change outside region");
      const prepared = prepareProjectChanges({
        callerFlags: ["caller"],
        changes: {
          flags: { source: { exclude: [], include: ["src/**"] } },
          source: { compareWith: "HEAD~1" }
        },
        projectRoot: repository
      });
      assert.deepEqual(prepared.effectiveFlags, ["caller"]);
      assert.deepEqual(prepared.projectChanges, { files: [], ok: true });
      assert.equal(Object.isFrozen(prepared.effectiveFlags), true);
      assert.equal(prepared.projectChanges.ok, true);
      if (!prepared.projectChanges.ok) return;
      assert.equal(Object.isFrozen(prepared.projectChanges.files), true);
    } finally {
      rmSync(repository, { force: true, recursive: true });
    }
  });

  it("rejects raw Git paths that could masquerade as region path separators", () => {
    const repository = repositoryFixture();
    try {
      write(repository, "src\\generated\\ignored.ts", "export const raw = true;\n");

      const prepared = prepareProjectChanges({
        callerFlags: ["caller"],
        changes: {
          flags: { all: { exclude: ["src/generated/**"], include: ["**/*"] } },
          source: { compareWith: "HEAD" }
        },
        projectRoot: repository
      });

      assert.deepEqual(prepared.effectiveFlags, ["caller", `${CHANGE_FLAG_PREFIX}all`]);
      assert.deepEqual(prepared.projectChanges, {
        ok: false,
        reason: { code: GIT_CHANGES_UNAVAILABLE_CODE }
      });
    } finally {
      rmSync(repository, { force: true, recursive: true });
    }
  });

  it("scopes every Git delta to a nested project root and retains only its side of cross-root renames", () => {
    const repository = nestedRepositoryFixture();
    const projectRoot = join(repository, "packages", "app");
    try {
      write(repository, "packages/app/src/committed.ts", "export const committed = 2;\n");
      rmSync(join(repository, "packages/app/src/deleted.ts"));
      git(repository, ["mv", "packages/app/src/renamed-out.ts", "docs/renamed-out.ts"]);
      write(repository, "docs/committed-outside.md", "# outside\n");
      commit(repository, "nested committed changes");

      write(repository, "packages/app/src/staged.ts", "export const staged = true;\n");
      git(repository, ["mv", "docs/moved-in.ts", "packages/app/src/moved-in.ts"]);
      git(repository, ["add", "packages/app"]);
      write(repository, "packages/app/config/unstaged.md", "# unstaged\n");
      write(repository, "docs/unstaged-outside.md", "# outside\n");
      write(repository, "packages/app/src/untracked.ts", "export const untracked = true;\n");
      write(repository, "docs/untracked-outside.ts", "export const outside = true;\n");

      const prepared = prepareProjectChanges({
        callerFlags: [],
        changes: {
          flags: { all: { exclude: [], include: ["**/*"] } },
          source: { compareWith: "HEAD~1" }
        },
        projectRoot
      });

      assert.equal(prepared.projectChanges.ok, true);
      if (!prepared.projectChanges.ok) return;
      assert.deepEqual(
        prepared.projectChanges.files.map(({ path }) => path),
        [
          "config/unstaged.md",
          "src/committed.ts",
          "src/deleted.ts",
          "src/moved-in.ts",
          "src/renamed-out.ts",
          "src/staged.ts",
          "src/untracked.ts"
        ]
      );
      assert(prepared.projectChanges.files.every(({ path }) => !path.startsWith("..")));
    } finally {
      rmSync(repository, { force: true, recursive: true });
    }
  });
});

function file(path: string, ids: readonly string[]) {
  return {
    flags: ids.map((id) => `${CHANGE_FLAG_PREFIX}${id}`),
    path
  };
}

function repositoryFixture(): string {
  const repository = mkdtempSync(join(tmpdir(), "vibe-check-changes-git-"));
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "changes-test@example.invalid"]);
  git(repository, ["config", "user.name", "Changes Test"]);
  write(repository, "src/committed.ts", "export const committed = 1;\n");
  write(repository, "src/deleted.ts", "export const deleted = true;\n");
  write(repository, "src/renamed-old.ts", "export const renamed = true;\n");
  write(repository, "src/generated/ignored.ts", "export const ignored = 1;\n");
  write(repository, "docs/initial.md", "# initial\n");
  commit(repository, "baseline");
  return repository;
}

function nestedRepositoryFixture(): string {
  const repository = mkdtempSync(join(tmpdir(), "vibe-check-changes-nested-git-"));
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "changes-test@example.invalid"]);
  git(repository, ["config", "user.name", "Changes Test"]);
  write(repository, "packages/app/src/committed.ts", "export const committed = 1;\n");
  write(repository, "packages/app/src/deleted.ts", "export const deleted = true;\n");
  write(repository, "packages/app/src/renamed-out.ts", "export const renamed = true;\n");
  write(repository, "docs/moved-in.ts", "export const moved = true;\n");
  write(repository, "docs/unchanged.md", "# unchanged\n");
  commit(repository, "nested baseline");
  return repository;
}

function gitText(repository: string, args: readonly string[]): string {
  const result = spawnSync("git", args, { cwd: repository, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}
