import { defineContextCallback } from "../context-callback/define-context-callback.ts";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { changeFlag } from "../../check/flag-enablement.ts";
import { defineCheck } from "../../check/check.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { commit, git, write } from "../../project-run/changes/git.test-support.ts";
import { debugChangeFlags, formatChangeFlagDebugReport } from "./change-flag-debugging.ts";

import { fixture, options } from "./change-flag-debugging.test-support.ts";

describe("change flag debugging", () => {
  it("retains the full selected universe with zero, single and overlapping bidirectional hits", () => {
    const root = fixture(["docs/a.md", "src/a.ts", "src/b.ts", "zero.txt"]);
    try {
      const input = options(root);
      const report = debugChangeFlags({
        ...input,
        regions: {
          ...input.regions,
          extra: { patterns: ["src/a.ts"] },
          docs: { patterns: ["docs/**"] }
        }
      });
      assert.deepEqual(report.files, [
        { path: "docs/a.md", flags: [changeFlag("docs")], hitCount: 1 },
        { path: "src/a.ts", flags: [changeFlag("extra"), changeFlag("source")], hitCount: 2 },
        { path: "src/b.ts", flags: [changeFlag("source")], hitCount: 1 },
        { path: "zero.txt", flags: [], hitCount: 0 }
      ]);
      assert.deepEqual(report.filesForFlag(changeFlag("source")), ["src/a.ts", "src/b.ts"]);
      assert.deepEqual(report.filesForFlag(changeFlag("empty")), []);
      assert.deepEqual(report.flagsForFile("zero.txt"), []);
      assert.equal(report.flagsForFile("unselected.txt"), undefined);
      assert.equal(report.filesForFlag(changeFlag("unknown")), undefined);
      assert.equal(report.filesForFlag("source"), undefined);
      for (const file of report.files) {
        assert.deepEqual(report.flagsForFile(file.path), file.flags);
        assert.equal(file.hitCount, file.flags.length);
        for (const region of report.regions) {
          assert.equal(
            [...file.flags].some((flag) => flag === region.flag),
            region.files.includes(file.path)
          );
          assert.deepEqual(report.filesForFlag(region.flag), region.files);
        }
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("uses complete native lists and matches public Run for the same current paths", async () => {
    const root = fixture(["baseline.txt"]);
    try {
      git(root, ["init", "--quiet"]);
      git(root, ["config", "user.email", "fixture@example.invalid"]);
      git(root, ["config", "user.name", "Fixture"]);
      commit(root, "baseline");
      const paths = [
        "build/a.ts",
        "docs/new.md",
        "src/.hidden.ts",
        "src/generated/new.ts",
        "src/plain.ts",
        "zero.txt"
      ];
      for (const path of paths) write(root, path, "new\n");
      const regions = {
        brace: { patterns: ["{build,src}/**/*.ts"] },
        empty: { patterns: [] },
        extglob: { patterns: ["src/**/@(plain|.hidden).ts"] },
        negative: { patterns: ["!docs/**", "!zero.txt"] },
        reinclude: { patterns: ["src/**", "!src/generated/**", "src/generated/new.ts"] },
        caseSensitive: { patterns: ["SRC/**"] },
        basename: { patterns: ["*.ts"] }
      };
      const report = debugChangeFlags({
        projectRoot: root,
        selection: { patterns: paths, useDefaultExcludes: false },
        regions
      });
      assert.deepEqual(
        report.files.map(({ path, flags }) => ({ path, flags })),
        [
          { path: "build/a.ts", flags: ["brace", "negative"].map(changeFlag) },
          { path: "docs/new.md", flags: [] },
          {
            path: "src/.hidden.ts",
            flags: ["brace", "extglob", "negative", "reinclude"].map(changeFlag)
          },
          {
            path: "src/generated/new.ts",
            flags: ["brace", "negative", "reinclude"].map(changeFlag)
          },
          {
            path: "src/plain.ts",
            flags: ["brace", "extglob", "negative", "reinclude"].map(changeFlag)
          },
          { path: "zero.txt", flags: [] }
        ]
      );
      let observed: unknown;
      const definition = defineConfig({
        changes: { source: { compareWith: "HEAD" }, flags: regions },
        checks: [
          defineCheck({
            checkId: "observe",
            displayName: "Observe",
            execute: defineContextCallback("check.execute", {
              contextNeeds: ["project"],
              callback: (_options, { project }) => {
                observed = project.changes;
                return { status: "passed", data: {} };
              }
            })
          })
        ],
        outputs: {
          machinePublication: { enabled: false },
          diagnosticLogging: { enabled: false },
          progressRendering: { enabled: false }
        }
      });
      const result = await run(definition, { projectRoot: root });
      assert.equal(result.kind, "completed");
      assert.deepEqual(observed, {
        ok: true,
        files: report.files
          .filter(({ hitCount }) => hitCount > 0)
          .map(({ path, flags }) => ({ path, flags }))
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("isolates inputs and frozen results and refreshes files and rules on each invocation", () => {
    const root = fixture(["src/a.ts"]);
    try {
      const patterns = ["src/**"];
      const regionPatterns = ["src/**"];
      const regions: Record<string, { patterns: string[] }> = {};
      Object.setPrototypeOf(regions, null);
      for (const id of ["__proto__", "a\0b", "constructor"])
        regions[id] = { patterns: regionPatterns };
      const input = { projectRoot: root, selection: { patterns }, regions };
      const first = debugChangeFlags(input);
      assert.deepEqual(first.files[0]?.flags, ["__proto__", "a\0b", "constructor"].map(changeFlag));
      assert.equal(Object.isFrozen(input), false);
      patterns.push("docs/**");
      regionPatterns.splice(0, 1, "docs/**");
      write(root, "docs/new.md", "new\n");
      const second = debugChangeFlags(input);
      assert.deepEqual(
        first.files.map(({ path }) => path),
        ["src/a.ts"]
      );
      assert.deepEqual(
        second.files.map(({ path }) => path),
        ["docs/new.md", "src/a.ts"]
      );
      assert.equal(second.files[1]?.hitCount, 0);
      assert.equal(second.files[0]?.hitCount, 3);
      assert.deepEqual(first.regions[0]?.patterns, ["src/**"]);
      for (const target of [
        first,
        first.scope,
        first.files,
        first.files[0],
        first.files[0]?.flags,
        first.scope.patterns,
        first.scope.defaultExcludes,
        first.regions,
        first.regions[0],
        first.regions[0]?.patterns,
        first.regions[0]?.files
      ]) {
        assert.equal(Object.isFrozen(target), true);
        assert.throws(() => Object.defineProperty(target, "mutated", { value: true }), TypeError);
      }
      const { flagsForFile, filesForFlag } = first;
      assert.deepEqual(flagsForFile("src/a.ts"), first.files[0]?.flags);
      assert.deepEqual(filesForFlag(changeFlag("a\0b")), ["src/a.ts"]);
      assert.match(formatChangeFlagDebugReport(first), /a\\u0000b/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("queries and formats the same snapshot with acquisition and output facilities blocked", () => {
    const root = fixture(["src/a.ts", "zero.txt"]);
    try {
      const moduleUrl = new URL("./change-flag-debugging.ts", import.meta.url).href;
      const child = spawnSync(
        process.execPath,
        [
          "--eval",
          `
        import assert from 'node:assert/strict';
        import fs from 'node:fs';
        import cp from 'node:child_process';
        import { syncBuiltinESMExports } from 'node:module';
        const { debugChangeFlags, formatChangeFlagDebugReport } = await import(${JSON.stringify(moduleUrl)});
        const blocked = () => { throw new Error('Unexpected I/O'); };
        console.log = blocked; console.error = blocked;
        process.stdout.write = blocked; process.stderr.write = blocked;
        const report = debugChangeFlags(${JSON.stringify(options(root))});
        for (const name of ['readdirSync','readFileSync','lstatSync','statSync','writeFileSync','openSync']) fs[name] = blocked;
        for (const name of ['spawnSync','execSync','execFileSync']) cp[name] = blocked;
        syncBuiltinESMExports();
        assert.deepEqual(report.flagsForFile('zero.txt'), []);
        assert.deepEqual(report.filesForFlag('vibe-check:change:source'), ['src/a.ts']);
        const text = formatChangeFlagDebugReport(report);
        assert.ok(text.includes('"zero.txt" 命中=0 flags=[]'));
        assert.ok(text.includes('不是实际 Git evidence'));
        assert.equal(text, formatChangeFlagDebugReport(report));
      `
        ],
        { encoding: "utf8" }
      );
      assert.equal(child.status, 0, child.stderr);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
