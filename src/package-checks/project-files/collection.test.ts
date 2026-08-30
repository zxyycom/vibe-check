import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { collectProjectFileSets, collectProjectFiles } from "./collection.ts";
import {
  defaultProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "./configuration.ts";
import type { ProjectFileSelection } from "./configuration.ts";

describe("quality submodule input", () => {
  it("includes initialized current submodule worktree files", { timeout: 20_000 }, () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-submodule-"));
    const submoduleOrigin = join(tempDir, "submodule-origin");
    const repository = join(tempDir, "repository");
    const submodulePath = join(repository, "modules", "tool");
    const committedPath = "modules/tool/src/committed.ts";
    const untrackedPath = "modules/tool/src/untracked.ts";
    const workingPath = "modules/tool/src/working.ts";
    const selection = {
      exclude: ["**/.git", "**/.git/**"],
      include: ["modules/tool/**/*.ts"],
      source: "git-worktree"
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

      assert.deepEqual(collectProjectFiles(repository, selection), [
        committedPath,
        untrackedPath,
        workingPath
      ]);
      const broadSelection = { ...selection, include: ["**/*"] } as const;
      assert.equal(collectProjectFiles(repository, broadSelection).includes("modules/tool"), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("does not re-enter parent from a replaced HEAD gitlink", { timeout: 5_000 }, () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-submodule-transition-"));
    const submoduleOrigin = join(tempDir, "submodule-origin");
    const repository = join(tempDir, "repository");
    const submodulePath = join(repository, "modules", "tool");
    const selection = {
      exclude: ["**/.git", "**/.git/**"],
      include: ["src/**/*.ts"],
      source: "git-worktree"
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

      assert.deepEqual(collectProjectFiles(repository, selection), ["src/kept.ts"]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("quality input file collection", () => {
  const gitSelection = {
    exclude: ["**/.git", "**/.git/**", "**/generated/**", "**/vendor/**"],
    include: ["src/**/*.ts"],
    source: "git-worktree"
  } satisfies ProjectFileSelection;

  it("treats successful empty Git results as authoritative", () => {
    const repository = mkdtempSync(join(tmpdir(), "vibe-check-quality-git-empty-"));

    try {
      initializeRepository(repository);
      writeFixtureFile(repository, ".gitignore", "src/ignored.ts\n");
      writeFixtureFile(repository, "src/ignored.ts", "export const ignored = true;\n");

      assert.deepEqual(collectProjectFiles(repository, gitSelection), []);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it("enumerates the filesystem independently of Git ignore rules", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-quality-filesystem-"));
    const selection = { ...gitSelection, source: "filesystem" } as const;

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

      assert.deepEqual(collectProjectFiles(projectRoot, selection), [
        "src/ignored.ts",
        "src/kept.ts"
      ]);

      assert.throws(
        () => collectProjectFiles(join(projectRoot, "missing-root"), selection),
        /could not read directory .*missing-root/u
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when the selected Git source is unavailable", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-quality-git-unavailable-"));

    try {
      writeFixtureFile(projectRoot, "src/kept.ts", "export const kept = true;\n");
      assert.throws(
        () => collectProjectFiles(projectRoot, gitSelection),
        /could not enumerate git-worktree files/u
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("does not add exclusions outside the selected filesystem config", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-quality-selected-config-"));
    const selection = {
      exclude: [],
      include: ["vendor/**/*.ts"],
      source: "filesystem"
    } satisfies ProjectFileSelection;

    try {
      writeFixtureFile(projectRoot, "vendor/kept.ts", "export const kept = true;\n");
      assert.deepEqual(collectProjectFiles(projectRoot, selection), ["vendor/kept.ts"]);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("uses the same minimatch semantics for Git and filesystem candidates", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-glob-owner-"));
    const repository = join(tempDir, "repository");
    const filesystemRoot = join(tempDir, "filesystem");
    const selection = {
      exclude: ["**/.git", "**/.git/**"],
      include: ["src/**/*.{ts,tsx}"],
      source: "git-worktree"
    } satisfies ProjectFileSelection;

    try {
      initializeRepository(repository);
      for (const root of [repository, filesystemRoot]) {
        writeFixtureFile(root, "src/component.tsx", "export const component = true;\n");
        writeFixtureFile(root, "src/nested/module.ts", "export const module = true;\n");
        writeFixtureFile(root, "src/ignored.js", "export const ignored = true;\n");
        writeFixtureFile(root, "docs/outside.ts", "export const outside = true;\n");
      }
      commitAll(repository, "glob candidates");
      writeFixtureFile(repository, "src/untracked.ts", "export const untracked = true;\n");
      writeFixtureFile(filesystemRoot, "src/untracked.ts", "export const untracked = true;\n");

      const expected = ["src/component.tsx", "src/nested/module.ts", "src/untracked.ts"];
      assert.deepEqual(collectProjectFiles(repository, selection), expected);
      assert.deepEqual(
        collectProjectFiles(filesystemRoot, { ...selection, source: "filesystem" }),
        expected
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("resolves multiple filesystem sets from one named selection call", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-quality-file-sets-"));

    try {
      writeFixtureFile(projectRoot, "src/product.ts", "export const product = true;\n");
      writeFixtureFile(projectRoot, "scripts/tool.ts", "export const tool = true;\n");
      const selected = collectProjectFileSets(projectRoot, {
        product: { exclude: [], include: ["src/**/*.ts"], source: "filesystem" },
        tooling: { exclude: [], include: ["scripts/**/*.ts"], source: "filesystem" }
      });

      assert.deepEqual(selected.get("product"), ["src/product.ts"]);
      assert.deepEqual(selected.get("tooling"), ["scripts/tool.ts"]);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("applies explicit default exclusions while retaining other dot files", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-quality-default-files-"));

    try {
      writeFixtureFile(projectRoot, ".visible-config", "enabled=true\n");
      writeFixtureFile(projectRoot, ".cache/state", "cached\n");
      writeFixtureFile(projectRoot, ".git/config", "[core]\n");
      writeFixtureFile(projectRoot, ".log/vibe-check/run.log", "diagnostic\n");
      writeFixtureFile(projectRoot, ".pytest_cache/state", "cached\n");
      writeFixtureFile(projectRoot, ".tmp/generated.ts", "export const temporary = true;\n");
      writeFixtureFile(projectRoot, ".venv/module.py", "value = True\n");
      writeFixtureFile(projectRoot, ".vibe-check/state", "generated\n");
      writeFixtureFile(projectRoot, "__pycache__/module.pyc", "cached\n");
      writeFixtureFile(projectRoot, "artifacts/report.json", "{}\n");
      writeFixtureFile(projectRoot, "build/output.ts", "export const build = true;\n");
      writeFixtureFile(projectRoot, "coverage/report.json", "{}\n");
      writeFixtureFile(projectRoot, "dist/output.ts", "export const dist = true;\n");
      writeFixtureFile(projectRoot, "generated/output.ts", "export const generated = true;\n");
      writeFixtureFile(projectRoot, "node_modules/package/index.js", "module.exports = {};\n");
      writeFixtureFile(projectRoot, "src/value.generated.ts", "export const generated = true;\n");
      writeFixtureFile(projectRoot, "src/value.ts", "export const value = true;\n");
      writeFixtureFile(projectRoot, "target/output.rs", "fn generated() {}\n");
      writeFixtureFile(projectRoot, "tmp/generated.ts", "export const temporary = true;\n");
      writeFixtureFile(projectRoot, "vendor/package/index.js", "module.exports = {};\n");
      writeFixtureFile(projectRoot, "venv/module.py", "value = True\n");

      assert.equal(Object.isFrozen(defaultProjectFileSelection), true);
      assert.equal(Object.isFrozen(defaultProjectFileSelection.exclude), true);
      assert.equal(Object.isFrozen(defaultProjectFileSelection.include), true);
      const snapshot = snapshotDefaultProjectFileSelection();
      assert.deepEqual(snapshot, defaultProjectFileSelection);
      assert.notEqual(snapshot, defaultProjectFileSelection);
      assert.notEqual(snapshot.exclude, defaultProjectFileSelection.exclude);
      assert.notEqual(snapshot.include, defaultProjectFileSelection.include);
      assert.deepEqual(collectProjectFiles(projectRoot, defaultProjectFileSelection), [
        ".visible-config",
        "src/value.ts"
      ]);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("preserves NUL-delimited Git candidate paths containing newlines", () => {
    const repository = mkdtempSync(join(tmpdir(), "vibe-check-quality-git-paths-"));
    const newlinePath = "src/line\nbreak.ts";

    try {
      initializeRepository(repository);
      writeFixtureFile(repository, newlinePath, "export const newline = true;\n");
      assert.deepEqual(collectProjectFiles(repository, gitSelection), [newlinePath]);
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
