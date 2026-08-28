import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { collectProjectFiles } from "./collection.ts";
import type { ProjectFileSelection } from "./configuration.ts";

describe("quality submodule input", () => {
  it("includes initialized current submodule worktree files", { timeout: 20_000 }, () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-submodule-"));
    const submoduleOrigin = join(tempDir, "submodule-origin");
    const repository = join(tempDir, "repository");
    const submodulePath = join(repository, "modules", "tool");
    const committedPath = "modules/tool/src/committed.ts";
    const untrackedPath = "modules/tool/src/untracked.ts";
    const workingPath = "modules/tool/src/working.ts";
    const config = {
      excludeDirs: [".git"],
      generatedFiles: [],
      include: ["modules/tool/**/*.ts"]
    } satisfies ProjectFileSelection;

    try {
      initializeRepository(submoduleOrigin);
      writeFixtureFile(submoduleOrigin, "src/committed.ts", "export const committed = 1;\n");
      writeFixtureFile(submoduleOrigin, "src/working.ts", "export const working = 1;\n");
      const baselineSubmoduleSha = commitAll(submoduleOrigin, "baseline");
      writeFixtureFile(submoduleOrigin, "src/committed.ts", "export const committed = 2;\n");
      const currentSubmoduleSha = commitAll(submoduleOrigin, "current");

      initializeRepository(repository);
      git(repository, [
        "-c",
        "protocol.file.allow=always",
        "submodule",
        "add",
        submoduleOrigin,
        "modules/tool"
      ]);
      git(submodulePath, ["checkout", "--detach", baselineSubmoduleSha]);
      commitAll(repository, "baseline submodule");
      git(submodulePath, ["checkout", "--detach", currentSubmoduleSha]);
      commitAll(repository, "current submodule");
      writeFixtureFile(submodulePath, "src/working.ts", "export const working = 2;\n");
      writeFixtureFile(submodulePath, "src/untracked.ts", "export const untracked = true;\n");

      assert.deepEqual(collectProjectFiles(repository, config), [
        committedPath,
        untrackedPath,
        workingPath
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("does not re-enter parent from a replaced HEAD gitlink", { timeout: 5_000 }, () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-submodule-transition-"));
    const submoduleOrigin = join(tempDir, "submodule-origin");
    const repository = join(tempDir, "repository");
    const submodulePath = join(repository, "modules", "tool");
    const config = {
      excludeDirs: [".git"],
      generatedFiles: [],
      include: ["src/**/*.ts"]
    } satisfies ProjectFileSelection;

    try {
      initializeRepository(submoduleOrigin);
      writeFixtureFile(submoduleOrigin, "lib/submodule.ts", "export const submodule = true;\n");
      commitAll(submoduleOrigin, "submodule");

      initializeRepository(repository);
      writeFixtureFile(repository, "src/kept.ts", "export const kept = true;\n");
      git(repository, [
        "-c",
        "protocol.file.allow=always",
        "submodule",
        "add",
        submoduleOrigin,
        "modules/tool"
      ]);
      commitAll(repository, "submodule gitlink");

      git(repository, ["rm", "--cached", "--force", "modules/tool"]);
      rmSync(join(submodulePath, ".git"), { force: true });
      writeFixtureFile(submodulePath, "lib/replaced.ts", "export const replaced = true;\n");
      git(repository, ["add", "modules/tool"]);

      assert.deepEqual(collectProjectFiles(repository, config), ["src/kept.ts"]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("quality input file collection", () => {
  const config = {
    excludeDirs: [".git", "vendor"],
    generatedFiles: ["**/generated/**"],
    include: ["src/**/*.ts"]
  } satisfies ProjectFileSelection;

  it("treats successful empty Git results as authoritative", () => {
    const repository = mkdtempSync(join(tmpdir(), "docnav-quality-git-empty-"));

    try {
      initializeRepository(repository);
      writeFixtureFile(repository, ".gitignore", "src/ignored.ts\n");
      writeFixtureFile(repository, "src/ignored.ts", "export const ignored = true;\n");

      assert.deepEqual(collectProjectFiles(repository, config), []);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it("uses config-only fallback when Git fails", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "docnav-quality-git-fallback-"));

    try {
      writeFixtureFile(projectRoot, ".gitignore", "src/ignored.ts\n");
      writeFixtureFile(projectRoot, "src/ignored.ts", "export const ignored = true;\n");
      writeFixtureFile(projectRoot, "src/kept.ts", "export const kept = true;\n");
      writeFixtureFile(
        projectRoot,
        "src/generated/excluded.ts",
        "export const generated = true;\n"
      );
      writeFixtureFile(projectRoot, "src/vendor/excluded.ts", "export const vendor = true;\n");
      writeFixtureFile(projectRoot, "docs/excluded.md", "# Not included\n");

      const expected = ["src/ignored.ts", "src/kept.ts"];
      assert.deepEqual(collectProjectFiles(projectRoot, config), expected);

      const missingRoot = join(projectRoot, "missing-root");
      assert.throws(
        () => collectProjectFiles(missingRoot, config),
        /could not read directory .*missing-root/u
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("does not add built-in exclusions to the selected fallback config", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "docnav-quality-selected-config-"));
    const selectedConfig = {
      excludeDirs: [],
      generatedFiles: [],
      include: ["vendor/**/*.ts"]
    } satisfies ProjectFileSelection;

    try {
      writeFixtureFile(projectRoot, "vendor/kept.ts", "export const kept = true;\n");

      assert.deepEqual(collectProjectFiles(projectRoot, selectedConfig), ["vendor/kept.ts"]);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("uses minimatch include semantics for Git and fallback candidates", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-glob-owner-"));
    const repository = join(tempDir, "repository");
    const fallbackRoot = join(tempDir, "fallback");
    const braceConfig = {
      excludeDirs: [".git"],
      generatedFiles: [],
      include: ["src/**/*.{ts,tsx}"]
    } satisfies ProjectFileSelection;

    try {
      initializeRepository(repository);
      for (const root of [repository, fallbackRoot]) {
        writeFixtureFile(root, "src/component.tsx", "export const component = true;\n");
        writeFixtureFile(root, "src/nested/module.ts", "export const module = true;\n");
        writeFixtureFile(root, "src/ignored.js", "export const ignored = true;\n");
        writeFixtureFile(root, "docs/outside.ts", "export const outside = true;\n");
      }
      commitAll(repository, "glob candidates");
      writeFixtureFile(repository, "src/untracked.ts", "export const untracked = true;\n");
      writeFixtureFile(fallbackRoot, "src/untracked.ts", "export const untracked = true;\n");

      const expected = ["src/component.tsx", "src/nested/module.ts", "src/untracked.ts"];
      assert.deepEqual(collectProjectFiles(repository, braceConfig), expected);
      assert.deepEqual(collectProjectFiles(fallbackRoot, braceConfig), expected);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("preserves NUL-delimited Git candidate paths containing newlines", () => {
    const repository = mkdtempSync(join(tmpdir(), "vibe-check-quality-git-paths-"));
    const newlinePath = "src/line\nbreak.ts";

    try {
      initializeRepository(repository);
      writeFixtureFile(repository, newlinePath, "export const newline = true;\n");

      assert.deepEqual(collectProjectFiles(repository, config), [newlinePath]);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});

function writeFixtureFile(rootDir: string, relPath: string, content: string): void {
  const absPath = join(rootDir, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf8");
}

function initializeRepository(repository: string): void {
  mkdirSync(repository, { recursive: true });
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "quality-test@example.invalid"]);
  git(repository, ["config", "user.name", "Quality Test"]);
}

function commitAll(repository: string, message: string): string {
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", message]);
  return git(repository, ["rev-parse", "HEAD"]);
}

function git(repository: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8"
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  return result.stdout.trim();
}
