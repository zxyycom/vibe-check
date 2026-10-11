import assert from "node:assert/strict";
import { symlinkSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

import { DEFAULT_PROJECT_FILE_EXCLUDES } from "../../package-checks/project-files/configuration.ts";
import { write } from "../../project-run/changes/git.test-support.ts";
import { debugChangeFlags } from "./change-flag-debugging.ts";
import { fixture, options } from "./change-flag-debugging.test-support.ts";

describe("change flag debugging", () => {
  it("reports effective root and defaults while collecting only ordinary no-follow files", () => {
    const root = fixture(["src/a.ts", "build/a.ts", ".hidden.ts", "node_modules/a.ts"]);
    try {
      symlinkSync(join(root, "src"), join(root, "linked-dir"), "dir");
      symlinkSync(join(root, "src/a.ts"), join(root, "linked-file.ts"));
      for (const useDefaultExcludes of [undefined, true, false]) {
        const selection =
          useDefaultExcludes === undefined
            ? { patterns: ["**/*"] }
            : { patterns: ["**/*"], useDefaultExcludes };
        const report = debugChangeFlags({ ...options(relative(process.cwd(), root)), selection });
        assert.deepEqual(report.scope, {
          projectRoot: root,
          patterns: ["**/*"],
          useDefaultExcludes: useDefaultExcludes !== false,
          defaultExcludes: useDefaultExcludes === false ? [] : DEFAULT_PROJECT_FILE_EXCLUDES,
          fileKind: "regular",
          followSymlinks: false,
          snapshot: "per-call-non-atomic"
        });
        assert.deepEqual(
          report.files.map(({ path }) => path),
          useDefaultExcludes === false
            ? [".hidden.ts", "build/a.ts", "node_modules/a.ts", "src/a.ts"]
            : [".hidden.ts", "src/a.ts"]
        );
      }
      const selected = debugChangeFlags({
        ...options(root),
        selection: { patterns: ["src/**", "!src/a.ts", "build/**"] }
      });
      assert.deepEqual(selected.files, []);
      assert.equal(selected.flagsForFile("src/a.ts"), undefined);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("distinguishes valid empty snapshots from closed-input and necessary filesystem failures", () => {
    const root = fixture([]);
    try {
      for (const patterns of [[], ["missing/**"]])
        assert.deepEqual(debugChangeFlags({ ...options(root), selection: { patterns } }).files, []);
      const invalid: unknown[] = [
        null,
        {},
        { ...options(root), extra: true },
        { ...options(root), projectRoot: "" },
        { ...options(root), projectRoot: "a\0b" },
        { ...options(root), selection: { patterns: [""] } },
        { ...options(root), selection: { patterns: ["**/*"], useDefaultExcludes: undefined } },
        { ...options(root), selection: { patterns: ["**/*"], useDefaultExcludes: 0 } },
        { ...options(root), selection: { patterns: ["**/*"], extra: true } },
        { ...options(root), regions: {} },
        { ...options(root), regions: { "": { patterns: [] } } },
        { ...options(root), regions: { a: { patterns: [""] } } },
        { ...options(root), regions: { a: { patterns: [], useDefaultExcludes: false } } }
      ];
      let getterCalls = 0;
      const getter = () => {
        getterCalls += 1;
        throw new Error("getter must not execute");
      };
      for (const level of ["options", "selection", "regions", "region", "patterns"] as const) {
        const input = { ...options(root) };
        const malformed = Object.defineProperty({}, "patterns", { enumerable: true, get: getter });
        if (level === "options")
          invalid.push(Object.defineProperty(input, "regions", { enumerable: true, get: getter }));
        if (level === "selection") invalid.push({ ...input, selection: malformed });
        if (level === "regions")
          invalid.push({
            ...input,
            regions: Object.defineProperty({}, "a", { enumerable: true, get: getter })
          });
        if (level === "region") invalid.push({ ...input, regions: { a: malformed } });
        if (level === "patterns")
          invalid.push({
            ...input,
            regions: {
              a: { patterns: Object.defineProperty(["a"], "0", { enumerable: true, get: getter }) }
            }
          });
      }
      const sparse: unknown = Array(1);
      const otherPrototype: unknown = Object.setPrototypeOf(["**/*"], null);
      for (const patterns of [sparse, Object.assign(["**/*"], { extra: true }), otherPrototype]) {
        invalid.push({ ...options(root), selection: { patterns } });
        invalid.push({ ...options(root), regions: { a: { patterns } } });
      }
      const inherited = {};
      Object.setPrototypeOf(inherited, { inherited: true });
      for (const malformed of [
        Object.assign({}, { [Symbol("extra")]: true }),
        inherited,
        Object.defineProperty({}, "hidden", { value: true })
      ]) {
        invalid.push({
          ...options(root),
          regions: Object.assign(malformed, { a: { patterns: [] } })
        });
      }
      for (const input of invalid)
        assert.throws(() => Reflect.apply(debugChangeFlags, undefined, [input]), TypeError);
      assert.equal(getterCalls, 0);
      const report = debugChangeFlags(options(root));
      for (const path of ["../a", "a\\b", "a\0b", ""])
        assert.throws(() => report.flagsForFile(path), TypeError);
      for (const flag of ["", null, 0])
        assert.throws(() => Reflect.apply(report.filesForFlag, undefined, [flag]), TypeError);
      assert.throws(
        () => debugChangeFlags(options(join(root, "missing"))),
        (error) =>
          error instanceof Error &&
          !(error instanceof TypeError) &&
          error.message.includes("missing")
      );
      write(root, "not-directory", "x");
      assert.throws(
        () => debugChangeFlags(options(join(root, "not-directory"))),
        (error) => error instanceof Error && !(error instanceof TypeError)
      );
      symlinkSync(root, join(root, "linked-root"), "dir");
      assert.throws(
        () => debugChangeFlags(options(join(root, "linked-root"))),
        (error) => error instanceof Error && !(error instanceof TypeError)
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
