import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { collectProjectFiles as original } from "../../../src/index.ts";
import { collectProjectFiles as candidate } from "./literal/public-collection.ts";
import { assertNoArguments, describeComparisonFailure } from "./helper-inputs.ts";

assertNoArguments(process.argv.slice(2), "differential-probe.ts");
const root = mkdtempSync(join(tmpdir(), "file-selection-differential-"));
const names = [
  "src/a.ts",
  "src/B.ts",
  "src/.dot.ts",
  "src/sub/a.ts",
  "src/a.generated.ts",
  "build/x.ts",
  ".git/config",
  "doc/é.md",
  "a-b_c.1",
  "bracket/[x].ts",
  "newline/a\nb.ts",
  "src/a\\b.ts"
];
for (const p of names) {
  mkdirSync(dirname(resolve(root, p)), { recursive: true });
  writeFileSync(resolve(root, p), "x");
}
const lists = [
  [],
  ["src/a.ts"],
  ["src/a.ts", "src/B.ts", "missing.ts"],
  ["build/x.ts", ".git/config"],
  ["**/*"],
  ["!build/**"],
  ["**/*", "!src/**", "src/a.ts"],
  ["src/**", "!src/sub/**"],
  ["src/{a,B}.ts"],
  ["src/!(B).ts"],
  ["!(build)/**"],
  ["!!src/a.ts"],
  ["./src/a.ts"],
  ["src//a.ts"],
  ["doc/é.md"],
  ["bracket/[[]x].ts"],
  ["**/*", "!**/*\\*"],
  ["newline/*"],
  ["*"]
];
let comparisons = 0;
for (const patterns of lists)
  for (const useDefaultExcludes of [undefined, true, false]) {
    const opts = {
      projectRoot: root,
      selection: { patterns, ...(useDefaultExcludes === undefined ? {} : { useDefaultExcludes }) }
    };
    function result(fn: typeof original) {
      try {
        return { paths: fn(opts) };
      } catch (error: unknown) {
        return describeComparisonFailure(error);
      }
    }
    assert.deepEqual(result(candidate), result(original));
    comparisons++;
  }
console.log(JSON.stringify({ comparisons, root, patterns: lists.length }));
