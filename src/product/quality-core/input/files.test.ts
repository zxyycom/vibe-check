import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  buildFingerprints,
  collectBaselineFiles,
  collectScanFiles,
  type ScanInputConfig
} from "./files.ts";
import { materializeBaselineRevision } from "./revisions.ts";

describe("quality input fingerprints", () => {
  it("uses stable SHA-256 fingerprints for sorted file content", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-fingerprint-"));
    const orderedFileMap = new Map([["typescript", ["src/a.ts", "src/b.ts"]]]);
    const reversedFileMap = new Map([["typescript", ["src/b.ts", "src/a.ts"]]]);

    try {
      writeFixtureFile(tempDir, "src/a.ts", "export const a = 1;\n");
      writeFixtureFile(tempDir, "src/b.ts", "export const b = 2;\n");

      const ordered = buildFingerprints(orderedFileMap, tempDir).typescript;
      const reversed = buildFingerprints(reversedFileMap, tempDir).typescript;
      assert.equal(reversed.fingerprint, ordered.fingerprint);
      assert.match(ordered.fingerprint, /^sha256:[a-f0-9]{64}:2$/);

      writeFixtureFile(tempDir, "src/b.ts", "export const b = 3;\n");
      const changed = buildFingerprints(orderedFileMap, tempDir).typescript;
      assert.notEqual(changed.fingerprint, ordered.fingerprint);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("quality submodule input", () => {
  it("keeps current and baseline submodule files aligned", { timeout: 20_000 }, () => {
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
    } satisfies ScanInputConfig;

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
      const baselineRootSha = commitAll(repository, "baseline submodule");
      git(submodulePath, ["checkout", "--detach", currentSubmoduleSha]);
      commitAll(repository, "current submodule");
      writeFixtureFile(submodulePath, "src/working.ts", "export const working = 2;\n");
      writeFixtureFile(submodulePath, "src/untracked.ts", "export const untracked = true;\n");

      assert.deepEqual(
        collectScanFiles(repository, config),
        [committedPath, untrackedPath, workingPath]
      );

      const materialized = materializeBaselineRevision({
        baselineWorkDir: join(tempDir, "materialized"),
        commitSha: baselineRootSha,
        cwd: repository
      });
      assert.equal(materialized.ok, true, materialized.ok ? undefined : materialized.error);
      if (!materialized.ok) return;

      assert.deepEqual(collectBaselineFiles(materialized.workDir, config), [committedPath, workingPath]);
      assert.equal(
        readFileSync(join(materialized.workDir, committedPath), "utf8").trim(),
        "export const committed = 1;"
      );
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
  } satisfies ScanInputConfig;

  it("treats successful empty Git results as authoritative for current and baseline", () => {
    const repository = mkdtempSync(join(tmpdir(), "docnav-quality-git-empty-"));

    try {
      initializeRepository(repository);
      writeFixtureFile(repository, ".gitignore", "src/ignored.ts\n");
      writeFixtureFile(repository, "src/ignored.ts", "export const ignored = true;\n");

      assert.deepEqual(collectScanFiles(repository, config), []);
      assert.deepEqual(collectBaselineFiles(repository, config), []);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  it("uses config-only fallback for current and baseline when Git fails", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "docnav-quality-git-fallback-"));

    try {
      writeFixtureFile(projectRoot, ".gitignore", "src/ignored.ts\n");
      writeFixtureFile(projectRoot, "src/ignored.ts", "export const ignored = true;\n");
      writeFixtureFile(projectRoot, "src/kept.ts", "export const kept = true;\n");
      writeFixtureFile(projectRoot, "src/generated/excluded.ts", "export const generated = true;\n");
      writeFixtureFile(projectRoot, "src/vendor/excluded.ts", "export const vendor = true;\n");
      writeFixtureFile(projectRoot, "docs/excluded.md", "# Not included\n");

      const expected = ["src/ignored.ts", "src/kept.ts"];
      assert.deepEqual(collectScanFiles(projectRoot, config), expected);
      assert.deepEqual(collectBaselineFiles(projectRoot, config), expected);
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
    } satisfies ScanInputConfig;

    try {
      writeFixtureFile(projectRoot, "vendor/kept.ts", "export const kept = true;\n");

      assert.deepEqual(collectScanFiles(projectRoot, selectedConfig), [
        "vendor/kept.ts"
      ]);
      assert.deepEqual(collectBaselineFiles(projectRoot, selectedConfig), [
        "vendor/kept.ts"
      ]);
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
    } satisfies ScanInputConfig;

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

      const expected = [
        "src/component.tsx",
        "src/nested/module.ts",
        "src/untracked.ts"
      ];
      assert.deepEqual(collectScanFiles(repository, braceConfig), expected);
      assert.deepEqual(collectBaselineFiles(repository, braceConfig), expected);
      assert.deepEqual(collectScanFiles(fallbackRoot, braceConfig), expected);
      assert.deepEqual(collectBaselineFiles(fallbackRoot, braceConfig), expected);
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

      assert.deepEqual(collectScanFiles(repository, config), [newlinePath]);
      assert.deepEqual(collectBaselineFiles(repository, config), [newlinePath]);
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
