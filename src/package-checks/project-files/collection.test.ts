import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { matchesConfigPatterns } from "../../data-boundary/config-glob.ts";
import { collectProjectFiles, collectProjectFileSets } from "./collection.ts";
import {
  DEFAULT_PROJECT_FILE_EXCLUDES,
  defaultProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "./configuration.ts";
import {
  measurePrefixCopies,
  nativePatternFiles,
  nativePatternLists,
  observeCollectionAccesses,
  write
} from "./collection.test-support.ts";

describe("quality input file collection", () => {
  it("shares deep ancestor pruning without copying segment prefixes", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-deep-prune-"));
    const segments = ["prefix-cost", ...Array.from({ length: 24 }, (_, index) => `d${index}`)];
    const file = `${segments.join("/")}/file.ts`;
    try {
      write(root, file);
      const { value: sets, copiedPrefixSlots } = measurePrefixCopies(() => {
        const selected = collectProjectFileSets(root, {
          included: { patterns: ["**/*", "!**/absent/**"], useDefaultExcludes: false },
          outer: { patterns: ["**/*", "!prefix-cost/d0/**"], useDefaultExcludes: false },
          inner: { patterns: ["**/*", "!prefix-cost/d0/d1/**"], useDefaultExcludes: false }
        });
        assert.deepEqual(
          collectProjectFileSets(root, {
            outer: { patterns: ["**/*", "!prefix-cost/d0/**"], useDefaultExcludes: false },
            inner: { patterns: ["**/*", "!prefix-cost/d0/d1/**"], useDefaultExcludes: false }
          }),
          new Map([
            ["inner", []],
            ["outer", []]
          ])
        );
        return selected;
      });
      assert.deepEqual(sets.get("included"), [file]);
      assert.deepEqual(sets.get("outer"), []);
      assert.deepEqual(sets.get("inner"), []);
      assert.equal(copiedPrefixSlots, 0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("enumerates the filesystem independently of Git ignore rules", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-git-"));
    const originalPath = process.env.PATH;
    try {
      write(root, ".gitignore");
      fs.writeFileSync(join(root, ".gitignore"), "ignored.ts\nchild/\n");
      write(root, "ignored.ts");
      write(root, "child/.git/config");
      write(root, "child/file.ts");
      const expected = [".gitignore", "child/file.ts", "ignored.ts"];
      assert.deepEqual(collectProjectFiles(root, { patterns: ["**/*"] }), expected);
      assert.equal(spawnSync("git", ["init", "--quiet"], { cwd: root }).status, 0);
      assert.deepEqual(collectProjectFiles(root, { patterns: ["**/*"] }), expected);
      process.env.PATH = "";
      assert.deepEqual(collectProjectFiles(root, { patterns: ["**/*"] }), expected);
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("applies explicit default exclusions while retaining other dot files", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-defaults-"));
    try {
      for (const file of [
        ".visible",
        "src/a.ts",
        "node_modules/a.ts",
        "build/a.ts",
        "nested/.git/config",
        "src/a.generated.ts"
      ])
        write(root, file);
      for (const useDefaultExcludes of [undefined, true]) {
        for (const patterns of [
          ["**/*", "!node_modules/**", "node_modules/a.ts"],
          [".visible", "src/a.ts", "node_modules/a.ts", "build/a.ts", "src/a.generated.ts"]
        ])
          assert.deepEqual(
            collectProjectFiles(root, {
              patterns,
              ...(useDefaultExcludes === undefined ? {} : { useDefaultExcludes })
            }),
            [".visible", "src/a.ts"]
          );
      }
      assert.deepEqual(
        collectProjectFiles(root, { patterns: ["node_modules/a.ts"], useDefaultExcludes: false }),
        ["node_modules/a.ts"]
      );
      assert.deepEqual(
        collectProjectFiles(root, { patterns: ["**/*", "!build/**"], useDefaultExcludes: false }),
        [".visible", "nested/.git/config", "node_modules/a.ts", "src/a.generated.ts", "src/a.ts"]
      );
      assert.equal(Object.isFrozen(DEFAULT_PROJECT_FILE_EXCLUDES), true);
      assert.equal(Reflect.set(DEFAULT_PROJECT_FILE_EXCLUDES, 0, "**/*"), false);
      const snapshot = snapshotDefaultProjectFileSelection();
      assert.deepEqual(snapshot, defaultProjectFileSelection);
      assert.notEqual(snapshot.patterns, defaultProjectFileSelection.patterns);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("shares necessary directory reads without conflating mixed selections", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-shared-"));
    const originalRead = fs.readdirSync;
    const reads: string[] = [];
    try {
      for (const file of ["src/a.ts", "src/b.tsx", "node_modules/a.ts"]) write(root, file);
      Reflect.set(fs, "readdirSync", (target: fs.PathLike, options: { withFileTypes: true }) => {
        reads.push(resolve(String(target)));
        return originalRead(target, options);
      });
      const selected = collectProjectFileSets(root, {
        source: { patterns: ["src/**/*.ts", "node_modules/**/*.ts"] },
        overlap: { patterns: ["./src/a.ts", "./src/**/*.{ts,tsx}"] },
        dependency: { patterns: ["node_modules/**/*.ts"], useDefaultExcludes: false },
        empty: { patterns: [] }
      });
      assert.deepEqual(selected.get("source"), ["src/a.ts"]);
      assert.deepEqual(selected.get("overlap"), ["src/a.ts", "src/b.tsx"]);
      assert.deepEqual(selected.get("dependency"), ["node_modules/a.ts"]);
      assert.deepEqual(selected.get("empty"), []);
      assert.equal(new Set(reads).size, reads.length);
      for (const files of selected.values()) assert.equal(Object.isFrozen(files), true);

      write(root, "src/c.ts");
      const exactPaths = ["src/a.ts", "src/b.tsx", "src/c.ts"];
      reads.length = 0;
      const exact = collectProjectFileSets(root, {
        forward: { patterns: exactPaths },
        reverse: { patterns: [...[...exactPaths].reverse(), "src/a.ts"] }
      });
      for (const files of exact.values()) assert.deepEqual(files, exactPaths);
      assert.deepEqual([...reads].sort(), [root, join(root, "src")].sort());

      fs.rmSync(join(root, "src/a.ts"));
      assert.deepEqual(collectProjectFiles(root, { patterns: exactPaths }), [
        "src/b.tsx",
        "src/c.ts"
      ]);
    } finally {
      Reflect.set(fs, "readdirSync", originalRead);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("matches native complete lists consistently for collection and explicit paths", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-patterns-"));
    const files = nativePatternFiles;
    try {
      for (const file of files) write(root, file);
      for (const patterns of nativePatternLists) {
        const expected = files.filter((file) => matchesConfigPatterns(file, patterns)).sort();
        assert.deepEqual(
          collectProjectFiles(root, { patterns, useDefaultExcludes: false }),
          expected
        );
      }
      assert.deepEqual(
        collectProjectFiles(root, { patterns: ["missing/**/*.ts", "missing.ts"] }),
        []
      );
      write(root, "literal\\name.ts");
      assert.deepEqual(collectProjectFiles(root, { patterns: ["src/**/*.ts"] }), [
        "src/.dot.ts",
        "src/Safe_1-2.ts",
        "src/a.ts",
        "src/line\nbreak.ts",
        "src/référence.ts",
        "src/square[1].ts"
      ]);
      assert.deepEqual(
        collectProjectFiles(root, { patterns: ["**/*", "!literal*"] }),
        files.filter((file) => matchesConfigPatterns(file, ["**/*", "!literal*"])).sort()
      );
      assert.throws(
        () => collectProjectFiles(root, { patterns: ["**/*"] }),
        (error: unknown) =>
          error instanceof Error &&
          !(error instanceof TypeError) &&
          error.message.includes("literal\\name.ts")
      );
      // A literal beyond the locked native parser limit must retain the same acquisition
      // failure context instead of skipping the matcher until the final batch selection.
      const rawName = Buffer.concat([Buffer.from(`${root}/`), Buffer.from([0xff])]);
      fs.writeFileSync(rawName, "content\n");
      assert.throws(
        () => collectProjectFiles(root, { patterns: ["a".repeat(65537)] }),
        (error: unknown) =>
          error instanceof Error &&
          !(error instanceof SyntaxError) &&
          error.message.includes(`could not read project directory ${root}`) &&
          error.cause instanceof SyntaxError &&
          error.cause.message.includes("maximum allowed length: 65536")
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("prunes excluded task bases and static paths before inspection", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-prune-"));
    try {
      for (const file of ["src/a.ts", "blocked/a.ts", "node_modules/a.ts"]) write(root, file);
      observeCollectionAccesses((accesses) => {
        for (const patterns of [
          ["blocked/**/*.ts", "!blocked/**"],
          ["blocked/a.ts", "!blocked/**"],
          ["node_modules/**/*.ts"],
          ["node_modules/a.ts", "!node_modules/**", "node_modules/a.ts"]
        ]) {
          accesses.length = 0;
          assert.deepEqual(
            collectProjectFileSets(root, { selected: { patterns }, empty: { patterns: [] } }).get(
              "selected"
            ),
            []
          );
          assert.deepEqual(
            accesses.filter((target) => target !== root),
            []
          );
        }
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("distinguishes necessary access failures and disappearing directories from no-match", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-failure-"));
    const originalRead = fs.readdirSync;
    try {
      write(root, "src/a.ts");
      write(root, "blocked/a.ts");
      fs.chmodSync(join(root, "blocked"), 0);
      assert.deepEqual(collectProjectFiles(root, { patterns: ["src/**/*.ts"] }), ["src/a.ts"]);
      assert.deepEqual(collectProjectFiles(root, { patterns: ["**/*", "!blocked/**"] }), [
        "src/a.ts"
      ]);
      assert.throws(
        () => collectProjectFiles(root, { patterns: ["blocked/**/*.ts"] }),
        /could not read project directory .*blocked/u
      );
      fs.chmodSync(join(root, "blocked"), 0o755);
      Reflect.set(fs, "readdirSync", (target: fs.PathLike, options: { withFileTypes: true }) => {
        const entries = originalRead(target, options);
        if (resolve(String(target)) === root) fs.rmSync(join(root, "blocked"), { recursive: true });
        return entries;
      });
      assert.throws(
        () => collectProjectFiles(root, { patterns: ["blocked/**/*.ts"] }),
        /could not inspect project path .*blocked/u
      );
    } finally {
      Reflect.set(fs, "readdirSync", originalRead);
      if (fs.existsSync(join(root, "blocked"))) fs.chmodSync(join(root, "blocked"), 0o755);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not follow root base file directory or broken symbolic links", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-links-"));
    try {
      write(root, "src/a.ts");
      fs.symlinkSync("src", join(root, "directory"));
      fs.symlinkSync("src/a.ts", join(root, "file.ts"));
      fs.symlinkSync("missing", join(root, "broken.ts"));
      fs.symlinkSync(".", join(root, "root"));
      for (const patterns of [
        ["**/*.ts"],
        ["directory/**/*.ts"],
        ["directory/a.ts"],
        ["file.ts", "broken.ts"]
      ]) {
        assert.deepEqual(
          collectProjectFiles(root, { patterns }),
          patterns[0] === "**/*.ts" ? ["src/a.ts"] : []
        );
      }
      assert.throws(
        () => collectProjectFiles(join(root, "root"), { patterns: [] }),
        /not a real directory/u
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
