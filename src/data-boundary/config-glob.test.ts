import assert from "node:assert/strict";
import { describe, it } from "node:test";
import micromatch from "micromatch";

import { CONFIG_GLOB_OPTIONS, selectConfigPaths } from "./config-glob.ts";

describe("config path selection", () => {
  it("preserves native batch order and fallback while indexing safe literal lists", () => {
    const paths = ["b.ts", "a.ts", "a.ts", ".entry", "dir/a.ts", "dir/référence.ts"];
    for (const patterns of [
      ["a.ts", "b.ts", "a.ts", ".entry"],
      ["dir/a.ts", "missing", "a.ts"],
      ["dir/référence.ts"],
      ["*.ts", "!a.ts", "a.ts"],
      ["!dir/**"],
      ["./a.ts"],
      ["dir//a.ts"],
      []
    ]) {
      for (const candidates of [paths, ["./a.ts", "a.ts", "dir\\a.ts", "a.ts/"]]) {
        assert.deepEqual(
          selectConfigPaths(candidates, patterns),
          micromatch(candidates, patterns, CONFIG_GLOB_OPTIONS)
        );
      }
    }
    assert.throws(() => selectConfigPaths(["a.ts"], ["a".repeat(65537)]), SyntaxError);
    const literals = Array.from({ length: 128 }, (_, index) => `cost-file-${index}.ts`);
    // Capture a callable for explicit receiver forwarding, not an implicitly bound method.
    const originalExec: unknown = Reflect.get(RegExp.prototype, "exec");
    assert.ok(typeof originalExec === "function");
    let nativeLiteralTests = 0;
    Reflect.set(RegExp.prototype, "exec", function (this: RegExp, input: string) {
      if (this.source.includes("cost\\-file\\-")) nativeLiteralTests += 1;
      const match: unknown = Reflect.apply(originalExec, this, [input]);
      return match;
    });
    let selected;
    try {
      assert.deepEqual(
        micromatch([...literals].reverse(), literals, CONFIG_GLOB_OPTIONS),
        literals
      );
      assert.equal(nativeLiteralTests, literals.length * (literals.length - 1));
      nativeLiteralTests = 0;
      selected = selectConfigPaths([...literals].reverse(), literals);
    } finally {
      Reflect.set(RegExp.prototype, "exec", originalExec);
    }
    assert.deepEqual(selected, literals);
    assert.equal(nativeLiteralTests, 0);
  });
});
