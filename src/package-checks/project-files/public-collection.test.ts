import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";

import { defaultProjectFileSelection } from "./configuration.ts";
import { collectProjectFiles, type CollectProjectFilesOptions } from "./public-collection.ts";

describe("public project file collection", () => {
  it("collects a frozen detached selection snapshot from an explicit root", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-public-collection-"));
    const selection = {
      ...defaultProjectFileSelection,
      patterns: ["src/**/*.ts", "!**/fixtures/**"]
    } as const;

    try {
      writeFixtureFile(projectRoot, "src/zeta.ts", "export const zeta = true;\n");
      writeFixtureFile(projectRoot, "src/alpha.ts", "export const alpha = true;\n");
      writeFixtureFile(projectRoot, "src/fixtures/ignored.ts", "export const ignored = true;\n");
      writeFixtureFile(projectRoot, "generated/ignored.ts", "export const ignored = true;\n");

      const first = collectProjectFiles({ projectRoot, selection });
      const second = collectProjectFiles({
        projectRoot: relative(process.cwd(), projectRoot),
        selection
      });

      assert.deepEqual(first, ["src/alpha.ts", "src/zeta.ts"]);
      assert.deepEqual(second, first);
      assert.equal(Object.isFrozen(first), true);
      assert.notEqual(first, second);
      assert.equal(Reflect.set(first, 0, "src/mutated.ts"), false);
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("retains a successful empty selection as a frozen result", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-public-collection-empty-"));

    try {
      writeFixtureFile(projectRoot, "src/value.ts", "export const value = true;\n");
      const selected = collectProjectFiles({
        projectRoot,
        selection: { patterns: ["docs/**/*.md"] }
      });

      assert.deepEqual(selected, []);
      assert.equal(Object.isFrozen(selected), true);
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("rejects malformed input without invoking accessor hooks", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-public-collection-invalid-"));
    let rootGetterCalled = false;
    let selectionGetterCalled = false;
    let arrayGetterCalled = false;
    const selectionWithInvalidSwitch = validSelection();
    const selectionWithExtraKey = validSelection();
    const selectionWithoutPatterns = validSelection();
    const selectionWithNonStringPatterns = validSelection();
    const selectionWithSparsePatterns = validSelection();
    const selectionWithGetter = validSelection();
    const selectionWithAccessorArray = validSelection();
    const missingRoot = { projectRoot, selection: validSelection() };
    const missingSelection = { projectRoot, selection: validSelection() };
    const optionsWithExtraKey = { projectRoot, selection: validSelection() };
    const optionsWithGetter = { projectRoot, selection: validSelection() };
    const accessorPatterns = ["**/*"];

    Reflect.set(selectionWithInvalidSwitch, "useDefaultExcludes", "other");
    Reflect.set(selectionWithExtraKey, "extra", true);
    Reflect.deleteProperty(selectionWithoutPatterns, "patterns");
    Reflect.set(selectionWithNonStringPatterns, "patterns", [0]);
    Reflect.set(selectionWithSparsePatterns, "patterns", new Array(1));
    Reflect.deleteProperty(selectionWithGetter, "patterns");
    Object.defineProperty(selectionWithGetter, "patterns", {
      enumerable: true,
      get(): string[] {
        selectionGetterCalled = true;
        return ["**/*"];
      }
    });
    Reflect.deleteProperty(accessorPatterns, "0");
    Object.defineProperty(accessorPatterns, "0", {
      enumerable: true,
      get(): string {
        arrayGetterCalled = true;
        return "**/*";
      }
    });
    Reflect.set(selectionWithAccessorArray, "patterns", accessorPatterns);
    Reflect.deleteProperty(missingRoot, "projectRoot");
    Reflect.deleteProperty(missingSelection, "selection");
    Reflect.set(optionsWithExtraKey, "extra", true);
    Reflect.deleteProperty(optionsWithGetter, "projectRoot");
    Object.defineProperty(optionsWithGetter, "projectRoot", {
      enumerable: true,
      get(): string {
        rootGetterCalled = true;
        return projectRoot;
      }
    });

    try {
      for (const options of [
        missingRoot,
        missingSelection,
        { projectRoot: "", selection: validSelection() },
        { projectRoot: "\0", selection: validSelection() },
        { projectRoot, selection: selectionWithInvalidSwitch },
        { projectRoot, selection: selectionWithExtraKey },
        { projectRoot, selection: selectionWithoutPatterns },
        { projectRoot, selection: selectionWithNonStringPatterns },
        { projectRoot, selection: selectionWithSparsePatterns },
        { projectRoot, selection: selectionWithGetter },
        { projectRoot, selection: selectionWithAccessorArray },
        optionsWithExtraKey,
        optionsWithGetter
      ]) {
        assert.throws(() => collectProjectFiles(options), TypeError);
      }
      assert.equal(rootGetterCalled, false);
      assert.equal(selectionGetterCalled, false);
      assert.equal(arrayGetterCalled, false);
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("keeps required filesystem failures distinct from invalid invocation", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-public-collection-failure-"));
    try {
      for (const patterns of [[], ["**/*"]])
        assert.throws(
          () =>
            collectProjectFiles({
              projectRoot: join(projectRoot, "missing"),
              selection: { patterns }
            }),
          (error: unknown) =>
            error instanceof Error &&
            !(error instanceof TypeError) &&
            error.message.includes("missing")
        );
      assert.throws(
        () => collectProjectFiles({ projectRoot, selection: { patterns: [""] } }),
        TypeError
      );
      for (const key of ["source", "include", "exclude"]) {
        const selection = { patterns: ["**/*"], [key]: key === "source" ? "filesystem" : [] };
        assert.throws(() => collectProjectFiles({ projectRoot, selection }), TypeError);
      }
      for (const useDefaultExcludes of [undefined, null, 0, "false"])
        assert.throws(
          () =>
            Reflect.apply(collectProjectFiles, undefined, [
              {
                projectRoot,
                selection: { patterns: [], useDefaultExcludes }
              }
            ]),
          TypeError
        );
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });
});

function validSelection(): CollectProjectFilesOptions["selection"] {
  return { patterns: ["**/*"] };
}

function writeFixtureFile(rootDir: string, relativePath: string, content: string): void {
  const absolutePath = join(rootDir, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}
