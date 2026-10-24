import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { mock } from "node:test";

import { resolveBunTestFiles } from "./bun-files.ts";

test("expands Bun test roots with include, ignore and supplemental files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-bun-surface-"));
  try {
    writeText(path.join(root, "scripts", "alpha.test.ts"));
    writeText(path.join(root, "scripts", "nested", "beta.test.ts"));
    writeText(path.join(root, "scripts", "ignored", "gamma.test.ts"));
    writeText(path.join(root, "scripts", "not-a-test.ts"));
    writeText(path.join(root, "special", "custom-test.ts"));

    const profile = {
      sourceRoots: ["scripts"],
      include: ["**/*.test.ts"],
      ignore: ["ignored/**"],
      supplementalFiles: ["special/custom-test.ts"]
    };

    assert.deepEqual(resolveBunTestFiles({ workspaceRoot: root, profile }), [
      "scripts/alpha.test.ts",
      "scripts/nested/beta.test.ts",
      "special/custom-test.ts"
    ]);

    writeText(path.join(root, "scripts", "new.test.ts"));
    assert.deepEqual(resolveBunTestFiles({ workspaceRoot: root, profile }), [
      "scripts/alpha.test.ts",
      "scripts/nested/beta.test.ts",
      "scripts/new.test.ts",
      "special/custom-test.ts"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("prunes excluded Bun subtrees after every include has a witness", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-bun-pruning-"));
  const readdir = mock.method(fs, "readdirSync");
  try {
    for (const sourcePath of [
      ".hidden.test.ts",
      "alpha.test.ts",
      "ignored/direct.test.ts",
      "ignored/nested/deep.test.ts",
      "nested/keep.test.ts",
      "nested/node_modules/package/foreign.test.ts",
      "vendor/package/foreign.test.ts"
    ]) {
      writeText(path.join(root, "scripts", sourcePath));
    }
    const profile = {
      sourceRoots: ["scripts"],
      include: ["**/*.test.ts"],
      ignore: ["{ignored,vendor}/**", "**/node_modules/**"],
      supplementalFiles: []
    };
    assert.deepEqual(resolveBunTestFiles({ workspaceRoot: root, profile }), [
      "scripts/.hidden.test.ts",
      "scripts/alpha.test.ts",
      "scripts/nested/keep.test.ts"
    ]);
    const visited = readdir.mock.calls.map(({ arguments: args }) => args[0]);
    for (const excluded of ["ignored", "nested/node_modules", "vendor"]) {
      assert.equal(visited.includes(path.join(root, "scripts", excluded)), false, excluded);
    }

    // A file-level ignore must not hide descendants, including undeclared node_modules.
    assert.deepEqual(
      resolveBunTestFiles({
        workspaceRoot: root,
        profile: { ...profile, ignore: ["ignored/*"] }
      }),
      [
        "scripts/.hidden.test.ts",
        "scripts/alpha.test.ts",
        "scripts/ignored/nested/deep.test.ts",
        "scripts/nested/keep.test.ts",
        "scripts/nested/node_modules/package/foreign.test.ts",
        "scripts/vendor/package/foreign.test.ts"
      ]
    );
  } finally {
    readdir.mock.restore();
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("keeps Bun include witnesses independent of subtree exclusion", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-bun-witness-"));
  try {
    writeText(path.join(root, "scripts", "alpha.test.ts"));
    writeText(path.join(root, "scripts", "ignored", "only.spec.ts"));
    writeText(path.join(root, "special", "supplemental.ts"));
    const profile = {
      sourceRoots: ["scripts"],
      include: ["**/*.test.ts", "ignored/**/*.spec.ts"],
      ignore: ["ignored/**"],
      supplementalFiles: []
    };
    assert.deepEqual(resolveBunTestFiles({ workspaceRoot: root, profile }), [
      "scripts/alpha.test.ts"
    ]);
    assert.throws(
      () =>
        resolveBunTestFiles({
          workspaceRoot: root,
          profile: { ...profile, include: [...profile.include, "ignored/**/missing.spec.ts"] }
        }),
      /Bun include pattern matched no files: ignored\/\*\*\/missing.spec.ts/u
    );
    const ignoredOnly = { ...profile, include: ["ignored/**/*.spec.ts"] };
    assert.throws(
      () => resolveBunTestFiles({ workspaceRoot: root, profile: ignoredOnly }),
      /^Error: Bun test surface matched no files$/u
    );
    assert.deepEqual(
      resolveBunTestFiles({
        workspaceRoot: root,
        profile: { ...ignoredOnly, supplementalFiles: ["special/supplemental.ts"] }
      }),
      ["special/supplemental.ts"]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("rejects invalid, empty and redundant Bun test surfaces", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-bun-surface-"));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-bun-surface-outside-"));
  try {
    writeText(path.join(root, "scripts", "alpha.test.ts"));
    writeText(path.join(outsideRoot, "nested", "external.test.ts"));
    writeText(path.join(outsideRoot, "nested", "supplemental.ts"));
    const base = {
      sourceRoots: ["scripts"],
      include: ["**/*.test.ts"],
      ignore: [],
      supplementalFiles: []
    };

    assert.throws(
      () =>
        resolveBunTestFiles({
          workspaceRoot: root,
          profile: { ...base, sourceRoots: ["missing"] }
        }),
      /source root/
    );
    assert.throws(
      () =>
        resolveBunTestFiles({
          workspaceRoot: root,
          profile: { ...base, include: ["**/*.spec.ts"] }
        }),
      /matched no files/
    );
    assert.throws(
      () =>
        resolveBunTestFiles({
          workspaceRoot: root,
          profile: {
            ...base,
            supplementalFiles: ["scripts/alpha.test.ts"]
          }
        }),
      /already included/
    );
    assert.throws(
      () =>
        resolveBunTestFiles({
          workspaceRoot: root,
          profile: {
            ...base,
            supplementalFiles: ["missing.test.ts"]
          }
        }),
      /supplemental file/
    );
    for (const field of ["include", "ignore"] as const) {
      for (const pattern of ["!ignored/**", "#ignored/**"]) {
        assert.throws(
          () =>
            resolveBunTestFiles({
              workspaceRoot: root,
              profile: { ...base, [field]: [pattern] }
            }),
          /positive relative POSIX globs/
        );
      }
    }

    const linkedRoot = path.join(root, "linked");
    fs.symlinkSync(outsideRoot, linkedRoot, process.platform === "win32" ? "junction" : "dir");
    assert.throws(
      () =>
        resolveBunTestFiles({
          workspaceRoot: root,
          profile: { ...base, sourceRoots: ["linked/nested"] }
        }),
      /symbolic link/
    );
    assert.throws(
      () =>
        resolveBunTestFiles({
          workspaceRoot: root,
          profile: {
            ...base,
            supplementalFiles: ["linked/nested/supplemental.ts"]
          }
        }),
      /symbolic link/
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
    fs.rmSync(outsideRoot, { force: true, recursive: true });
  }
});

function writeText(sourcePath: string): void {
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, "test content", "utf8");
}
